import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { applyTcgplayerPricesToScans } from "../../lib/card-search/tcgplayer-prices";
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
          columns: { id: true, gameId: true },
        });
        if (!collection) return null;

        const game = collection.gameId
          ? await tx.query.games.findFirst({
              where: (t, { eq }) => eq(t.id, collection.gameId!),
              columns: { key: true },
            })
          : null;

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
            isCorrected: collectionCards.isCorrected,
          })
          .from(collectionCards)
          .where(eq(collectionCards.collectionId, collection.id))
          .orderBy(desc(collectionCards.scannedAt));

        return { gameKey: game?.key, cards: rows.map(toScannedCard) };
      });
      if (!result) {
        return c.json({ success: false, message: "Collection not found." });
      }
      const data = await applyTcgplayerPricesToScans(
        result.gameKey,
        result.cards,
      );
      return c.json({ success: true, data });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
