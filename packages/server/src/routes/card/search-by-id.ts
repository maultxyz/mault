import { Hono } from "hono";
import { matchScopeForGame } from "../../lib/card-search/match-games";
import {
  ADAPTERS_BY_GAME_KEY,
  resolveCardSearchForGame,
  resolveGameKeyAndLang,
} from "../../lib/card-search/resolve";
import { searchCardById } from "../../lib/card-search/stored-cards";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const searchCardByIdRoute = new Hono<AppEnv>().get(
  "/search/:id",
  requireAuth,
  requireOrg,
  async (c) => {
    const collectionScope = await resolveGameKeyAndLang(
      c.get("jwtClaims"),
      c.req.query("collectionGuid"),
    );
    const requestedGameKey = c.req.query("gameKey");
    const scope =
      collectionScope &&
      requestedGameKey &&
      requestedGameKey !== collectionScope.gameKey &&
      requestedGameKey in ADAPTERS_BY_GAME_KEY
        ? matchScopeForGame(requestedGameKey)
        : collectionScope;
    const requestedLang = c.req.query("lang");
    const lang =
      scope?.matchAllLanguages && requestedLang ? requestedLang : scope?.lang;
    const resolved =
      scope && lang ? resolveCardSearchForGame(scope.gameKey, lang) : null;
    if (!scope || !resolved) {
      return c.json(
        { success: false, message: "No game configured for this collection." },
        400,
      );
    }
    const result = await searchCardById(resolved, c.req.param("id"));
    const gameKey = scope === collectionScope ? undefined : scope.gameKey;
    if (!result.success || !result.data || (lang === scope.lang && !gameKey)) {
      return c.json(result);
    }
    return c.json({ ...result, data: { ...result.data, lang, gameKey } });
  },
);
