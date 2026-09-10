import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { collectionCards } from "../../db/schema";
import { emitToOrg, emitToSession } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const clearCollectionCardsRoute = new Hono<AppEnv>().delete(
  "/:guid/cards",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const collection = await tx.query.collections.findFirst({
          where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
          columns: { id: true },
        });
        if (!collection)
          return { success: false, message: "Collection not found." };

        await tx
          .delete(collectionCards)
          .where(eq(collectionCards.collectionId, collection.id));

        return { success: true, data: null };
      });
      if (result.success) {
        emitToSession(guid, "cards_cleared", {});
        emitToOrg(orgId, "collections_changed", { guid });
      }
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
