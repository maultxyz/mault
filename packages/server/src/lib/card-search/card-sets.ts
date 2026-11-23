import type { CardSetOption, SetPrintingOption } from "@magic-vault/shared";
import { sql, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { registerMapCache } from "../cache-registry";
import { CARD_SETS_CACHE_TTL_MS } from "../constants/card-search";
import type { ResolvedCardSearch } from "../interfaces/card-search";

const cache = new Map<string, { sets: CardSetOption[]; expiresAt: number }>();
registerMapCache("catalog.cardSets", cache);
const inFlight = new Map<string, Promise<CardSetOption[]>>();

export function preferredSetNameSql(preferredLang: string): SQL {
  return sql`coalesce(max(set_name) FILTER (WHERE lang = ${preferredLang}), max(set_name))`;
}

export function toCardSetOptions(
  rows: { set_code: unknown; set_name: unknown; card_count: unknown }[],
): CardSetOption[] {
  return rows
    .map((row) => {
      const code = row.set_code as string;
      return {
        code,
        name: (row.set_name as string | null) || code.toUpperCase(),
        cardCount: Number(row.card_count),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function loadCardSets({
  gameKey,
  lang,
  searchAllLanguages,
  onlyLanguage,
}: ResolvedCardSearch): Promise<CardSetOption[]> {
  const languageMatch = onlyLanguage
    ? sql`AND lang = ${onlyLanguage}`
    : searchAllLanguages
      ? sql``
      : sql`AND lang = ${lang}`;
  const result = await db.execute<{ set_code: string; set_name: string | null; card_count: number }>(sql`
    SELECT set_code, ${preferredSetNameSql(lang)} AS set_name, count(*)::int AS card_count
    FROM cards
    WHERE game_key = ${gameKey} ${languageMatch} AND data IS NOT NULL
    GROUP BY set_code
  `);
  return toCardSetOptions(result.rows);
}

export async function listSetPrintings(
  { gameKey, lang }: ResolvedCardSearch,
  setCode: string,
): Promise<SetPrintingOption[]> {
  const result = await db.execute(sql`
    SELECT card_id, name, collector_number
    FROM cards
    WHERE game_key = ${gameKey}
      AND lang = ${lang}
      AND lower(set_code) = ${setCode.toLowerCase()}
    ORDER BY name, collector_number
  `);
  return result.rows.flatMap((row) => {
    if (typeof row.card_id !== "string" || typeof row.name !== "string") return [];
    return [
      {
        id: row.card_id,
        name: row.name,
        collectorNumber:
          typeof row.collector_number === "string" ? row.collector_number : "",
      },
    ];
  });
}

export async function listCardSets(
  resolved: ResolvedCardSearch,
): Promise<CardSetOption[]> {
  const languageKey =
    resolved.onlyLanguage ?? (resolved.searchAllLanguages ? "*" : resolved.lang);
  const key = `${resolved.gameKey}:${languageKey}`;
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
