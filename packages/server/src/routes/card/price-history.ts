import { Hono } from "hono";
import { loadCardPriceHistory } from "../../lib/card-price-history";
import { ADAPTERS_BY_GAME_KEY } from "../../lib/card-search/resolve";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const cardPriceHistoryRoute = new Hono<AppEnv>().get(
  "/price-history",
  requireAuth,
  requireOrg,
  async (c) => {
    const gameKey = c.req.query("gameKey");
    const cardId = c.req.query("cardId");
    const lang = c.req.query("lang") || "en";
    if (!gameKey || !(gameKey in ADAPTERS_BY_GAME_KEY)) {
      return c.json({ success: false, message: "Unknown game." }, 400);
    }
    if (!cardId) {
      return c.json({ success: false, message: "A card id is required." }, 400);
    }
    const points = await loadCardPriceHistory({ gameKey, lang, cardId });
    return c.json({ success: true, data: { points } });
  },
);
