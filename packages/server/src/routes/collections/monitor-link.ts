import {
  DEFAULT_MONITOR_LINK_EXPIRY_DAYS,
  DEFAULT_SHARE_LINK_SHOWS_PRICES,
  MONITOR_LINK_EXPIRY_DAYS,
  type MonitorLink,
} from "@magic-vault/shared";
import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { collections } from "../../db/schema";
import {
  closeMonitorLinkStreams,
  forgetVerifiedMonitorLinks,
  signMonitorLink,
} from "../../lib/monitor-links";
import {
  allowsLongShareLinks,
  parseShareLinkPurpose,
  shareLinkExpiresInMinutes,
} from "../../lib/share-link-policy";
import { isShareTokenConfigured } from "../../lib/share-tokens";
import type { ShareLinkRequestBody } from "../../lib/interfaces/share-tokens";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const monitorLinkRoute = new Hono<AppEnv>()
  .post("/:guid/monitor-link", requireAuth, requireOrg, async (c) => {
    if (!isShareTokenConfigured()) {
      return c.json(
        { success: false, message: "Monitor links are not configured." },
        503,
      );
    }
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const body = await c.req
      .json<ShareLinkRequestBody>()
      .catch(() => ({}) as ShareLinkRequestBody);
    const expiresInDays =
      body.expiresInDays ?? DEFAULT_MONITOR_LINK_EXPIRY_DAYS;
    if (
      !(MONITOR_LINK_EXPIRY_DAYS as readonly number[]).includes(expiresInDays)
    ) {
      return c.json({ success: false, message: "Invalid expiry." }, 400);
    }
    if (body.showPrices !== undefined && typeof body.showPrices !== "boolean") {
      return c.json({ success: false, message: "Invalid price visibility." }, 400);
    }
    const showsPrices = body.showPrices ?? DEFAULT_SHARE_LINK_SHOWS_PRICES;
    const purpose = parseShareLinkPurpose(body.purpose);
    if (!purpose) {
      return c.json({ success: false, message: "Invalid link type." }, 400);
    }
    const { collection, allowsLongLinks } = await authQuery(
      c.get("jwtClaims"),
      async (tx) => ({
        collection: await tx.query.collections.findFirst({
          where: (t, { eq, and }) =>
            and(eq(t.guid, guid), eq(t.orgId, orgId), eq(t.isDeleted, false)),
          columns: { monitorLinkVersion: true },
        }),
        allowsLongLinks: await allowsLongShareLinks(tx, orgId),
      }),
    );
    if (!collection) {
      return c.json({ success: false, message: "Collection not found." }, 404);
    }
    const { token, expiresAt } = await signMonitorLink(
      guid,
      orgId,
      collection.monitorLinkVersion,
      shareLinkExpiresInMinutes(purpose, allowsLongLinks, expiresInDays),
      showsPrices,
      purpose,
    );
    return c.json({
      success: true,
      message: "Created monitor link.",
      data: { token, expiresAt: expiresAt.toISOString() } satisfies MonitorLink,
    });
  })
  .post("/:guid/monitor-link/revoke", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
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
    forgetVerifiedMonitorLinks(guid);
    return c.json({ success: true, message: "Revoked monitor links." });
  });
