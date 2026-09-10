import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { unmatchedCards } from "../../db/schema";
import { emitToSession } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

// DELETE /collections/:guid/unmatched — soft-delete all unmatched cards for a collection
export const clearUnmatchedCardsRoute = new Hono<AppEnv>().delete(
  "/:guid/unmatched",
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
          .update(unmatchedCards)
          .set({ isDeleted: true })
          .where(eq(unmatchedCards.collectionId, collection.id));

        return { success: true, data: null };
      });
      if (result.success) emitToSession(guid, "unmatched_cleared", {});
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
