import { Hono } from "hono";
import {
  resolveCardSearchForGame,
  resolveManualCardSearch,
} from "../../lib/card-search/resolve";
import {
  CATALOG_SEARCH_GROUP_BY_NAME,
  CATALOG_SEARCH_GROUP_BY_PARAM,
  CATALOG_SEARCH_LIMIT_PARAM,
} from "@magic-vault/shared";
import {
  searchCards,
  searchCatalogCardsGroupedByName,
} from "../../lib/card-search/stored-cards";
import { catalogSearchPageLimit } from "../../lib/card-search/catalog-search-limit";
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
    const validOffset = Number.isFinite(offset) && offset > 0 ? offset : 0;
    const setCode = c.req.query("set") || undefined;
    if (c.req.query(CATALOG_SEARCH_GROUP_BY_PARAM) === CATALOG_SEARCH_GROUP_BY_NAME) {
      return c.json(
        await searchCatalogCardsGroupedByName(
          resolved,
          query,
          validOffset,
          setCode,
          catalogSearchPageLimit(c.req.query(CATALOG_SEARCH_LIMIT_PARAM)),
        ),
      );
    }
    const result = await searchCards(resolved, query, validOffset, setCode);
    return c.json(result);
  },
);
