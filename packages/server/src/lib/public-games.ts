import type { PublicGame } from "@magic-vault/shared";
import { and, count, eq } from "drizzle-orm";
import { db } from "../db";
import { cardImageVectors, games } from "../db/schema";
import { createCachedValue } from "./cached-value";

async function computePublicGames(): Promise<PublicGame[]> {
  const rows = await db
    .select({ key: games.key, name: games.name })
    .from(games)
    .where(and(eq(games.isActive, true), eq(games.isDeleted, false)))
    .orderBy(games.name);

  const countRows = await db
    .select({ gameKey: cardImageVectors.gameKey, count: count() })
    .from(cardImageVectors)
    .groupBy(cardImageVectors.gameKey);
  const countByKey = new Map(countRows.map((r) => [r.gameKey, r.count]));

  const langRows = await db
    .select({
      gameKey: cardImageVectors.gameKey,
      lang: cardImageVectors.lang,
    })
    .from(cardImageVectors)
    .groupBy(cardImageVectors.gameKey, cardImageVectors.lang);
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

export const publicGamesCache = createCachedValue(computePublicGames);
