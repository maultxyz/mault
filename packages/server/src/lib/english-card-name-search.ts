import { sql, type SQL } from "drizzle-orm";
import {
  ENGLISH_CARD_LANG,
  ENGLISH_CARD_NAME_SEARCH_MIN_LENGTH,
} from "./constants/english-card-name-search";
import type { EnglishCardNameSearchColumns } from "./interfaces/english-card-name-search";
import { containsLikePattern } from "./sql-like";

export function matchesEnglishCardNameSql(
  { gameKey, lang, setCode, collectorNumber }: EnglishCardNameSearchColumns,
  search: string,
): SQL | undefined {
  const trimmedSearch = search.trim();
  if (trimmedSearch.length < ENGLISH_CARD_NAME_SEARCH_MIN_LENGTH) return undefined;
  return sql`(${lang} <> ${ENGLISH_CARD_LANG} AND (${gameKey}::text, ${setCode}, lower(${collectorNumber})) IN (
    SELECT english_card.game_key, english_card.set_code, lower(english_card.collector_number)
    FROM cards english_card
    WHERE english_card.lang = ${ENGLISH_CARD_LANG}
      AND english_card.collector_number IS NOT NULL
      AND english_card.name ILIKE ${containsLikePattern(trimmedSearch)}
  ))`;
}
