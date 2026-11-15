import { Hono } from "hono";
import { resolveCardSearchForGame } from "../../lib/card-search/resolve";
import { listCardPrintings } from "../../lib/card-search/stored-cards";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const cardPrintingsRoute = new Hono<AppEnv>().get(
  "/printings",
  requireAuth,
  requireOrg,
  async (c) => {
    const gameKey = c.req.query("gameKey");
    const cardId = c.req.query("cardId") || undefined;
    const cardName = c.req.query("name") || undefined;
    const resolved = gameKey
      ? resolveCardSearchForGame(gameKey, c.req.query("lang") || "en")
      : null;
    if (!resolved) {
      return c.json({ success: false, message: "Unknown game." }, 400);
    }
    if (!cardId && !cardName) {
      return c.json(
        { success: false, message: "A card id or name is required." },
        400,
      );
    }
    const offset = Number.parseInt(c.req.query("offset") ?? "0", 10);
    const result = await listCardPrintings(resolved, {
      cardId,
      cardName,
      offset: Number.isFinite(offset) && offset > 0 ? offset : 0,
    });
    return c.json(result, result.success ? 200 : 404);
  },
);
