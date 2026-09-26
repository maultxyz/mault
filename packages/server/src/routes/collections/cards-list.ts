import { COLLECTION_CARDS_PAGE_SIZE } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { applyTcgplayerPricesToScans } from "../../lib/card-search/tcgplayer-prices";
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
        const collection = await findCardsCollection(
          tx,
          c.req.param("guid"),
          c.get("orgId"),
        );
        if (!collection) return null;

        const data = await loadCardsPage(
          tx,
          collection.id,
          collection.fieldDefinitions,
          query,
          page,
          COLLECTION_CARDS_PAGE_SIZE,
        );
        return { gameKey: collection.gameKey, data };
      });
      if (!result) {
        return c.json({ success: false, message: "Collection not found." });
      }
      const items = await applyTcgplayerPricesToScans(
        result.gameKey,
        result.data.items,
      );
      return c.json({
        success: true,
        data: {
          ...result.data,
          items,
          page,
          pageSize: COLLECTION_CARDS_PAGE_SIZE,
        },
      });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
