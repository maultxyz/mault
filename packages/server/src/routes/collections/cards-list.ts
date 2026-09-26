import { COLLECTION_CARDS_PAGE_SIZE } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
<<<<<<< HEAD
import { applyTcgplayerPricesToScans } from "../../lib/card-search/tcgplayer-prices";
import { collectionCards } from "../../db/schema";
=======
>>>>>>> master
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import {
  findCardsCollection,
  loadCardsPage,
  parseCardsQuery,
  parsePage,
} from "./cards-query";

export const listCollectionCardsRoute = new Hono<AppEnv>().get(
  "/:guid/cards",
  requireAuth,
  requireOrg,
  async (c) => {
    const query = parseCardsQuery(c.req.query());
    const page = parsePage(c.req.query("page"));
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
<<<<<<< HEAD
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
=======
        const collection = await findCardsCollection(
          tx,
          c.req.param("guid"),
          c.get("orgId"),
        );
        if (!collection)
          return { success: false, message: "Collection not found." };

        const data = await loadCardsPage(
          tx,
          collection.id,
          collection.fieldDefinitions,
          query,
          page,
          COLLECTION_CARDS_PAGE_SIZE,
        );
        return {
          success: true,
          data: { ...data, page, pageSize: COLLECTION_CARDS_PAGE_SIZE },
        };
>>>>>>> master
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
