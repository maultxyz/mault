import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { logActivity } from "../../lib/activity-log";
import { collectionCards } from "../../db/schema";
import { deleteScanImages } from "../../lib/scan-images";
import { emitToOrg, emitToSession } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { databaseErrorResponse } from "../../lib/database-error-response";

export const removeBulkCollectionCardsRoute = new Hono<AppEnv>().post(
  "/:guid/cards/remove-bulk",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const { scanIds } = await c.req.json<{ scanIds: string[] }>();
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const imageKeys: (string | null)[] = [];
        for (const scanId of scanIds) {
          const deleted = await tx
            .delete(collectionCards)
            .where(
              and(
                eq(collectionCards.guid, scanId),
                eq(collectionCards.orgId, orgId),
              ),
            )
            .returning({ imageKey: collectionCards.capturedImageKey });
          imageKeys.push(...deleted.map((row) => row.imageKey));
        }
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
        emitToOrg(orgId, "collections_changed", { guid });
      }
      return c.json({ success: result.success, data: result.data });
    } catch (err) {
      return databaseErrorResponse(c, err);
    }
  },
);
