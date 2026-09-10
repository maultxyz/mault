import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { collectionCards } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { toScannedCard } from "./shared";

export const listCollectionCardsRoute = new Hono<AppEnv>().get(
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

        const rows = await tx
          .select({
            guid: collectionCards.guid,
            card: collectionCards.card,
            scannedAt: collectionCards.scannedAt,
            binNumber: collectionCards.binNumber,
            isFoil: collectionCards.isFoil,
            foilType: collectionCards.foilType,
            isDownloaded: collectionCards.isDownloaded,
            alternativeMatches: collectionCards.alternativeMatches,
          })
          .from(collectionCards)
          .where(eq(collectionCards.collectionId, collection.id))
          .orderBy(desc(collectionCards.scannedAt));

        return { success: true, data: rows.map(toScannedCard) };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
