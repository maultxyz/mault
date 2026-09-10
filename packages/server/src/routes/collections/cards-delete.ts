import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { collectionCards } from "../../db/schema";
import { emitToOrg, emitToSession } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const deleteCollectionCardRoute = new Hono<AppEnv>().delete(
  "/:guid/cards/:scanId",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const { guid, scanId } = c.req.param();
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        await tx
          .delete(collectionCards)
          .where(
            and(
              eq(collectionCards.guid, scanId),
              eq(collectionCards.orgId, orgId),
            ),
          );
        return { success: true, data: null };
      });
      if (result.success) {
        emitToSession(guid, "card_removed", { scanId });
        emitToOrg(orgId, "collections_changed", { guid });
      }
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
