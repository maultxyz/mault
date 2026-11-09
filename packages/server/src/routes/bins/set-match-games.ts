import { and, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { binSets, games } from "../../db/schema";
import { warmCardMatchSegments } from "../../lib/card-match-index";
import { matchScopeForGame } from "../../lib/card-search/match-games";
import { ADAPTERS_BY_GAME_KEY } from "../../lib/card-search/resolve";
import { MATCH_GAME_KEYS_MAX } from "../../lib/constants/card-search";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { loadSets } from "./shared";

export const setMatchGamesRoute = new Hono<AppEnv>().put(
  "/:guid/match-games",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const { gameKeys } = await c.req.json<{ gameKeys: unknown }>();
    if (
      !Array.isArray(gameKeys) ||
      gameKeys.length > MATCH_GAME_KEYS_MAX ||
      !gameKeys.every(
        (gameKey) =>
          typeof gameKey === "string" && gameKey in ADAPTERS_BY_GAME_KEY,
      )
    ) {
      return c.json({ success: false, message: "Invalid games." }, 400);
    }
    const requestedGameKeys = [...new Set(gameKeys as string[])];
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const target = await tx.query.binSets.findFirst({
        where: (t, { eq, and }) =>
          and(eq(t.guid, guid), eq(t.orgId, orgId), eq(t.isDeleted, false)),
        columns: { id: true },
        with: { game: { columns: { key: true } } },
      });
      if (!target) return { message: "Set not found.", success: false };
      const activeGames =
        requestedGameKeys.length > 0
          ? await tx
              .select({ key: games.key })
              .from(games)
              .where(
                and(
                  inArray(games.key, requestedGameKeys),
                  eq(games.isActive, true),
                  eq(games.isDeleted, false),
                ),
              )
          : [];
      const activeGameKeys = new Set(activeGames.map((game) => game.key));
      const matchGameKeys = requestedGameKeys.filter(
        (gameKey) =>
          activeGameKeys.has(gameKey) && gameKey !== target.game?.key,
      );
      await tx
        .update(binSets)
        .set({ matchGameKeys, updatedAt: new Date() })
        .where(eq(binSets.id, target.id));
      warmCardMatchSegments(matchGameKeys.map(matchScopeForGame));
      return loadSets(tx, orgId);
    });
    return c.json(result);
  },
);
