import { Hono } from "hono";
import {
  resolveCardSearchForGame,
  resolveManualCardSearch,
} from "../../lib/card-search/resolve";
import { searchCards } from "../../lib/card-search/stored-cards";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const searchCardRoute = new Hono<AppEnv>().get(
  "/search",
  requireAuth,
  requireOrg,
  async (c) => {
    const query = c.req.query("q") ?? "";
    const collectionGuid = c.req.query("collectionGuid");
    const gameKey = c.req.query("gameKey");
    const resolved =
      !collectionGuid && gameKey
        ? resolveCardSearchForGame(gameKey, c.req.query("lang") || "en")
        : await resolveManualCardSearch(
            c.get("jwtClaims"),
            collectionGuid,
            c.req.query("lang"),
          );
    if (!resolved) {
      return c.json(
        { success: false, message: "No game configured for this collection." },
        400,
      );
    }
    const offset = Number.parseInt(c.req.query("offset") ?? "0", 10);
    const result = await searchCards(
      resolved,
      query,
      Number.isFinite(offset) && offset > 0 ? offset : 0,
      c.req.query("set") || undefined,
    );
    return c.json(result);
  },
);
