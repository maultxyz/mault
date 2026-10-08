import { Hono } from "hono";
import { authQuery } from "../../db";
import { applyCardPricesToScans } from "../../lib/card-search/card-prices";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import {
  findCardsCollection,
  isUuid,
  loadCardPosition,
  parseCardsQuery,
} from "./cards-query";

export const collectionCardPositionRoute = new Hono<AppEnv>().get(
  "/:guid/cards/:scanId/position",
  requireAuth,
  requireOrg,
  async (c) => {
    const scanId = c.req.param("scanId");
    if (!isUuid(scanId)) return c.json({ success: true, data: null });
    const query = parseCardsQuery(c.req.query());
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const collection = await findCardsCollection(
          tx,
          c.req.param("guid"),
          c.get("orgId"),
        );
        if (!collection)
          return { success: false, message: "Collection not found." };

        const data = await loadCardPosition(
          tx,
          collection.id,
          collection.fieldDefinitions,
          query,
          scanId,
        );
        return {
          success: true,
          gameKey: collection.gameKey,
          lang: collection.lang,
          data,
        };
      });
      if (!result.success || !("data" in result) || !result.data) {
        return c.json(result);
      }
      const [entry] = await applyCardPricesToScans(
        result.gameKey,
        result.lang,
        [result.data.entry],
      );
      return c.json({ success: true, data: { ...result.data, entry } });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
