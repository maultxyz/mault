import type { CardSetOption } from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { CARD_SETS_CACHE_TTL_MS } from "../constants/card-search";
import type { ResolvedCardSearch } from "../interfaces/card-search";

const cache = new Map<string, { sets: CardSetOption[]; expiresAt: number }>();
const inFlight = new Map<string, Promise<CardSetOption[]>>();

async function loadCardSets({
  adapter,
  gameKey,
  lang,
}: ResolvedCardSearch): Promise<CardSetOption[]> {
  const result = await db.execute(sql`
    SELECT DISTINCT ON (set_code)
      set_code,
      card_id,
      data,
      count(*) OVER (PARTITION BY set_code) AS card_count
    FROM cards
    WHERE game_key = ${gameKey} AND lang = ${lang} AND data IS NOT NULL
    ORDER BY set_code, card_id
  `);
  return result.rows
    .map((row) => {
      const code = row.set_code as string;
      const card = adapter.normalizeStored(
        row.data,
        row.card_id as string,
        lang,
      );
      return {
        code,
        name: card?.setName || code.toUpperCase(),
        cardCount: Number(row.card_count),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listCardSets(
  resolved: ResolvedCardSearch,
): Promise<CardSetOption[]> {
  const key = `${resolved.gameKey}:${resolved.lang}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.sets;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = loadCardSets(resolved)
    .then((sets) => {
      cache.set(key, { sets, expiresAt: Date.now() + CARD_SETS_CACHE_TTL_MS });
      return sets;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}
