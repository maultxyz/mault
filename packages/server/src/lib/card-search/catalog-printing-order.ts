import { sql, type SQL } from "drizzle-orm";
import {
  CATALOG_LEADING_COLLECTOR_NUMBER_PATTERN,
  CATALOG_RELEASE_DATE_PATTERN,
} from "../constants/card-search";
import type {
  CardPrintingsSqlParams,
  CardSearchAdapter,
  GroupedCatalogSearchSqlParams,
} from "../interfaces/card-search";

export function catalogReleaseDateSql(adapter: CardSearchAdapter): SQL {
  if (!adapter.releasedAtSql) return sql`NULL::text`;
  return sql`(CASE WHEN (${adapter.releasedAtSql}) ~ ${CATALOG_RELEASE_DATE_PATTERN} THEN left((${adapter.releasedAtSql}), 10) END)`;
}

export function catalogPrintingIsListedSql(adapter: CardSearchAdapter): SQL {
  return adapter.excludedFromMatchingSql
    ? sql`NOT coalesce((${adapter.excludedFromMatchingSql}), false)`
    : sql`true`;
}

export function newestPrintingFirstOrderSql(adapter: CardSearchAdapter): SQL[] {
  const releaseDate = catalogReleaseDateSql(adapter);
  const undatedReleaseSequence = adapter.releaseSequenceSql
    ? sql`(CASE WHEN ${releaseDate} IS NULL THEN (${adapter.releaseSequenceSql}) END)`
    : sql`NULL::bigint`;
  return [
    sql`${releaseDate} DESC NULLS LAST`,
    sql`coalesce((${adapter.rarePrintingSql ?? sql`false`}), false) ASC`,
    sql`${undatedReleaseSequence} DESC NULLS LAST`,
    sql`set_code DESC`,
    sql`(substring(collector_number from ${CATALOG_LEADING_COLLECTOR_NUMBER_PATTERN}))::int ASC NULLS LAST`,
    sql`collector_number ASC NULLS LAST`,
    sql`card_id ASC`,
  ];
}

export function shownPrintingFirstOrderSql(adapter: CardSearchAdapter): SQL[] {
  return [
    sql`coalesce((${adapter.rarePrintingSql ?? sql`false`}), false) ASC`,
    ...newestPrintingFirstOrderSql(adapter),
  ];
}

export function groupedCatalogSearchSql({
  adapter,
  gameKey,
  preferredLang,
  matchFilter,
  printingFilter,
  printingMatch,
  exactName,
  offset,
  limit,
}: GroupedCatalogSearchSqlParams): SQL {
  const printingMatchSql = sql`coalesce((${printingMatch ?? sql`false`}), false)`;
  return sql`
    WITH matched_cards AS MATERIALIZED (
      SELECT cards.lang, cards.name, ${printingMatchSql} AS is_printing_match
      FROM cards
      WHERE ${matchFilter} AND ${catalogPrintingIsListedSql(adapter)}
    ),
    page_names AS (
      SELECT cards.lang AS page_lang, cards.name AS page_name, bool_or(cards.is_printing_match) AS page_printing_match
      FROM matched_cards AS cards
      GROUP BY cards.lang, cards.name
      ORDER BY bool_or(cards.is_printing_match) DESC, lower(cards.name) = lower(${exactName}) DESC, cards.name, (cards.lang = ${preferredLang}) DESC, cards.lang
      OFFSET ${offset}
      LIMIT ${limit}
    )
    SELECT chosen.card_id, chosen.lang, chosen.data, (
      SELECT count(*)::int
      FROM cards
      WHERE cards.game_key = ${gameKey} AND cards.lang = page_names.page_lang AND cards.name = page_names.page_name AND cards.data IS NOT NULL AND ${catalogPrintingIsListedSql(adapter)}
    ) AS printing_count
    FROM page_names
    CROSS JOIN LATERAL (
      SELECT cards.card_id, cards.lang, cards.data
      FROM cards
      WHERE cards.game_key = ${gameKey} AND cards.lang = page_names.page_lang AND cards.name = page_names.page_name AND ${printingFilter}
      ORDER BY ${printingMatchSql} DESC, ${sql.join(shownPrintingFirstOrderSql(adapter), sql`, `)}
      LIMIT 1
    ) AS chosen
    ORDER BY page_names.page_printing_match DESC, lower(page_names.page_name) = lower(${exactName}) DESC, page_names.page_name, (page_names.page_lang = ${preferredLang}) DESC, page_names.page_lang
  `;
}

export function cardPrintingsSql({
  adapter,
  gameKey,
  lang,
  cardName,
  offset,
  limit,
}: CardPrintingsSqlParams): SQL {
  return sql`
    SELECT card_id, lang, data, count(*) OVER ()::int AS total_count
    FROM cards
    WHERE game_key = ${gameKey} AND lang = ${lang} AND name = ${cardName} AND data IS NOT NULL AND ${catalogPrintingIsListedSql(adapter)}
    ORDER BY ${sql.join(newestPrintingFirstOrderSql(adapter), sql`, `)}
    OFFSET ${offset}
    LIMIT ${limit}
  `;
}
