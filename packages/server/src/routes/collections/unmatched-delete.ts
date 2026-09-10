import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { unmatchedCards } from "../../db/schema";
import { emitToSession } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

// DELETE /collections/:guid/unmatched/:scanId — soft-delete one unmatched card
export const deleteUnmatchedCardRoute = new Hono<AppEnv>().delete(
  "/:guid/unmatched/:scanId",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const { guid, scanId } = c.req.param();
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        await tx
          .update(unmatchedCards)
          .set({ isDeleted: true })
          .where(
            and(
              eq(unmatchedCards.guid, scanId),
              eq(unmatchedCards.orgId, orgId),
            ),
          );
        return { success: true, data: null };
      });
      if (result.success) emitToSession(guid, "unmatched_removed", { scanId });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
