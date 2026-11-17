import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { logActivity } from "../../lib/activity-log";
import { collectionCards } from "../../db/schema";
import { deleteScanImages } from "../../lib/scan-images";
import { emitCollectionCardsChanged, emitToSession } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { uuidArraySql } from "../../lib/sql-arrays";
import { parseScanIds } from "./cards-query";

export const removeBulkCollectionCardsRoute = new Hono<AppEnv>().post(
  "/:guid/cards/remove-bulk",
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
      const deleted = await tx
        .delete(collectionCards)
        .where(
          and(
            sql`${collectionCards.guid} = ANY(${uuidArraySql(scanIds)})`,
            eq(collectionCards.orgId, orgId),
          ),
        )
        .returning({ imageKey: collectionCards.capturedImageKey });
      const imageKeys = deleted.map((row) => row.imageKey);
      if (imageKeys.length > 0) {
        await logActivity(tx, {
          orgId,
          userId: c.get("userId"),
          action: "cards.deleted",
          summary: null,
          details: { count: imageKeys.length, collectionGuid: guid },
        });
      }
      return { success: true, data: null, imageKeys };
    });
    if (result.success) {
      deleteScanImages(result.imageKeys);
      emitToSession(guid, "cards_removed", { scanIds });
      emitCollectionCardsChanged(orgId, guid);
    }
    return c.json({ success: result.success, data: result.data });
  },
);
