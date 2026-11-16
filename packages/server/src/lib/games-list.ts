import type { Game } from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { games } from "../db/schema";
import { createCachedValue } from "./cached-value";
import { GAMES_LIST_CACHE_MAX_AGE_MS } from "./constants/card-search";
import { toGame } from "../routes/games/shared";

const gamesListCache = createCachedValue(async (): Promise<Game[]> => {
  const rows = await db
    .select()
    .from(games)
    .where(eq(games.isDeleted, false))
    .orderBy(games.name);
  return rows.map(toGame);
});

export function listLiveGames(): Promise<Game[]> {
  return gamesListCache.get(GAMES_LIST_CACHE_MAX_AGE_MS);
}

export function invalidateGamesListCache(): void {
  gamesListCache.invalidate();
}
