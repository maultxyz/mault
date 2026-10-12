import { Hono } from "hono";
import {
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
    const scope = await resolveGameKeyAndLang(
      c.get("jwtClaims"),
      c.req.query("collectionGuid"),
    );
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
    if (!result.success || !result.data || lang === scope.lang) {
      return c.json(result);
    }
    return c.json({ ...result, data: { ...result.data, lang } });
  },
);
