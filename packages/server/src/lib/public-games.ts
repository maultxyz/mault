import type { PublicGame } from "@magic-vault/shared";
import { and, count, eq } from "drizzle-orm";
import { db } from "../db";
import { cardImageVectors, games } from "../db/schema";
import { createCachedValue } from "./cached-value";
import { invalidateGamesListCache } from "./games-list";
import type { CachedValue } from "./interfaces/cached-value";

async function computePublicGames(): Promise<PublicGame[]> {
  const [rows, countRows, langRows] = await Promise.all([
    db
      .select({ key: games.key, name: games.name })
      .from(games)
      .where(and(eq(games.isActive, true), eq(games.isDeleted, false)))
      .orderBy(games.name),
    db
      .select({ gameKey: cardImageVectors.gameKey, count: count() })
      .from(cardImageVectors)
      .groupBy(cardImageVectors.gameKey),
    db
      .select({
        gameKey: cardImageVectors.gameKey,
        lang: cardImageVectors.lang,
      })
      .from(cardImageVectors)
      .groupBy(cardImageVectors.gameKey, cardImageVectors.lang),
  ]);
  const countByKey = new Map(countRows.map((r) => [r.gameKey, r.count]));
  const langsByKey = new Map<string, string[]>();
  for (const row of langRows) {
    const list = langsByKey.get(row.gameKey) ?? [];
    list.push(row.lang);
    langsByKey.set(row.gameKey, list);
  }

  return rows.map((row) => ({
    ...row,
    cardCount: countByKey.get(row.key) ?? 0,
    languages: (langsByKey.get(row.key) ?? []).sort(),
  }));
}

const publicGamesValue = createCachedValue(computePublicGames);

export const publicGamesCache: CachedValue<PublicGame[]> = {
  get: (maxAgeMs, options) => publicGamesValue.get(maxAgeMs, options),
  invalidate() {
    publicGamesValue.invalidate();
    invalidateGamesListCache();
  },
};
