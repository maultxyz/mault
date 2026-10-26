import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { logActivity } from "../../lib/activity-log";
import { collectionCards } from "../../db/schema";
import {
  collectionScanImagePrefix,
  deleteScanImagePrefix,
} from "../../lib/scan-images";
import { emitToOrg, emitToSession } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const clearCollectionCardsRoute = new Hono<AppEnv>().delete(
  "/:guid/cards",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const collection = await tx.query.collections.findFirst({
        where: (t, { eq, and }) =>
          and(eq(t.guid, guid), eq(t.orgId, orgId), eq(t.isDeleted, false)),
        columns: { id: true, name: true },
      });
      if (!collection)
        return { success: false, message: "Collection not found." };

      const cleared = await tx
        .delete(collectionCards)
        .where(eq(collectionCards.collectionId, collection.id))
        .returning({ id: collectionCards.id });
      await logActivity(tx, {
        orgId,
        userId: c.get("userId"),
        action: "cards.cleared",
        summary: collection.name,
        details: { count: cleared.length, collectionGuid: guid },
      });

      return { success: true, data: null };
    });
    if (result.success) {
      deleteScanImagePrefix(collectionScanImagePrefix(orgId, guid, "cards"));
      emitToSession(guid, "cards_cleared", {});
      emitToOrg(orgId, "collections_changed", { guid });
    }
    return c.json(result);
  },
);
