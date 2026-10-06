import {
  DEFAULT_MONITOR_LINK_EXPIRY_DAYS,
  MONITOR_LINK_EXPIRY_DAYS,
  type MonitorLink,
} from "@magic-vault/shared";
import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { collections } from "../../db/schema";
import {
  closeMonitorLinkStreams,
  isMonitorLinkConfigured,
  signMonitorLink,
} from "../../lib/monitor-links";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const monitorLinkRoute = new Hono<AppEnv>()
  .post("/:guid/monitor-link", requireAuth, requireOrg, async (c) => {
    if (!isMonitorLinkConfigured()) {
      return c.json(
        { success: false, message: "Monitor links are not configured." },
        503,
      );
    }
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const body = await c.req
      .json<{ expiresInDays?: number }>()
      .catch(() => ({}) as { expiresInDays?: number });
    const expiresInDays =
      body.expiresInDays ?? DEFAULT_MONITOR_LINK_EXPIRY_DAYS;
    if (
      !(MONITOR_LINK_EXPIRY_DAYS as readonly number[]).includes(expiresInDays)
    ) {
      return c.json({ success: false, message: "Invalid expiry." }, 400);
    }
    try {
      const collection = await authQuery(c.get("jwtClaims"), (tx) =>
        tx.query.collections.findFirst({
          where: (t, { eq, and }) =>
            and(eq(t.guid, guid), eq(t.orgId, orgId), eq(t.isDeleted, false)),
          columns: { monitorLinkVersion: true },
        }),
      );
      if (!collection) {
        return c.json({ success: false, message: "Collection not found." }, 404);
      }
      const { token, expiresAt } = await signMonitorLink(
        guid,
        orgId,
        collection.monitorLinkVersion,
        expiresInDays,
      );
      return c.json({
        success: true,
        message: "Created monitor link.",
        data: { token, expiresAt: expiresAt.toISOString() } satisfies MonitorLink,
      });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  })
  .post("/:guid/monitor-link/revoke", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    try {
      const updated = await authQuery(c.get("jwtClaims"), (tx) =>
        tx
          .update(collections)
          .set({
            monitorLinkVersion: sql`${collections.monitorLinkVersion} + 1`,
          })
          .where(
            and(
              eq(collections.guid, guid),
              eq(collections.orgId, orgId),
              eq(collections.isDeleted, false),
            ),
          )
          .returning({ id: collections.id }),
      );
      if (updated.length === 0) {
        return c.json({ success: false, message: "Collection not found." }, 404);
      }
      closeMonitorLinkStreams(guid);
      return c.json({ success: true, message: "Revoked monitor links." });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  });
