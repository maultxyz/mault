import { Hono } from "hono";
import { listCardSets } from "../../lib/card-search/card-sets";
import {
  resolveCardSearch,
  resolveCardSearchForGame,
  resolveManualCardSearch,
} from "../../lib/card-search/resolve";
import { searchCardSets } from "../../lib/card-search/stored-cards";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const cardSetsRoute = new Hono<AppEnv>().get(
  "/sets",
  requireAuth,
  requireOrg,
  async (c) => {
    const query = c.req.query("q");
    const collectionGuid = c.req.query("collectionGuid");
    const gameKey = c.req.query("gameKey");
    const resolved = !collectionGuid && gameKey
      ? resolveCardSearchForGame(gameKey, c.req.query("lang") || "en")
      : query
      ? await resolveManualCardSearch(
          c.get("jwtClaims"),
          collectionGuid,
          c.req.query("lang"),
        )
      : await resolveCardSearch(c.get("jwtClaims"), collectionGuid);
    if (!resolved) {
      return c.json(
        { success: false, message: "No game configured for this collection." },
        400,
      );
    }
    return c.json({
      success: true,
      message: "Sets retrieved.",
      data: query
        ? await searchCardSets(resolved, query)
        : await listCardSets(resolved),
    });
  },
);
