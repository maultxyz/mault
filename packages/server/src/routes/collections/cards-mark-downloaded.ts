import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { collectionCards } from "../../db/schema";
import { emitToSession } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { uuidArraySql } from "../../lib/sql-arrays";
import { parseScanIds } from "./cards-query";

export const markCollectionCardsDownloadedRoute = new Hono<AppEnv>().post(
  "/:guid/cards/mark-downloaded",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const scanIds = parseScanIds(await c.req.json().catch(() => ({})));
    if (!scanIds) {
      return c.json({ success: false, message: "Invalid card ids." }, 400);
    }
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      await tx
        .update(collectionCards)
        .set({ isDownloaded: true })
        .where(
          and(
            sql`${collectionCards.guid} = ANY(${uuidArraySql(scanIds)})`,
            eq(collectionCards.orgId, orgId),
          ),
        );
      return { success: true, data: null };
    });
    if (result.success) emitToSession(guid, "cards_downloaded", { scanIds });
    return c.json(result);
  },
);
