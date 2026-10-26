import {
  CARD_CONDITIONS,
  CARD_PRICE_AT_SCAN_KEYS,
  conditionFactor,
  PRICE_SOURCE_FIELDS,
  type ConditionMultipliers,
  type OrgPricing,
} from "@magic-vault/shared";
import { sql, type AnyColumn, type SQL } from "drizzle-orm";
import {
  cardPrices,
  collectionCards,
  collections,
  games,
} from "../db/schema";
import {
  CARD_PRICE_COLUMNS,
  COLLECTION_CARD_SQL_COLUMNS,
} from "./constants/card-prices";
import type {
  CardPriceKey,
  ScannedCardSqlColumns,
} from "./interfaces/card-prices";

function storedCardPriceSelect(cols: ScannedCardSqlColumns, select: SQL): SQL {
  return sql`(
    SELECT ${select}
    FROM card_prices cp
    JOIN collections pc ON pc.id = ${cols.collectionId}
    JOIN games pg ON pg.id = pc.game_id
    WHERE cp.game_key = pg.key AND cp.lang = COALESCE(${cols.card} ->> 'lang', pc.lang) AND cp.card_id = ${cols.cardId}
  )`;
}

export function storedCardPriceSql(
  key: CardPriceKey,
  cols: ScannedCardSqlColumns = COLLECTION_CARD_SQL_COLUMNS,
): SQL<number | null> {
  return sql<
    number | null
  >`${storedCardPriceSelect(cols, sql.raw(`cp.${CARD_PRICE_COLUMNS[key]}`))}`;
}

function savedCardPriceSql(
  key: CardPriceKey,
  cols: ScannedCardSqlColumns,
): SQL {
  return sql`(CASE WHEN jsonb_typeof(${cols.card} -> ${key}::text) = 'number' THEN (${cols.card} ->> ${key}::text)::float8 END)`;
}

export function cardPriceValueSql(
  key: CardPriceKey,
  cols: ScannedCardSqlColumns = COLLECTION_CARD_SQL_COLUMNS,
): SQL<number | null> {
  return sql<
    number | null
  >`COALESCE(${storedCardPriceSql(key, cols)}, ${savedCardPriceSql(key, cols)})`;
}

export function conditionFactorSql(
  condition: SQL | AnyColumn,
  multipliers: ConditionMultipliers,
): SQL<number> {
  const cases = CARD_CONDITIONS.map(
    (c) =>
      sql`WHEN ${c}::text THEN ${conditionFactor(c, multipliers)}::float8`,
  );
  return sql<number>`(CASE ${condition} ${sql.join(cases, sql` `)} ELSE 1::float8 END)`;
}

function scannedPriceFrom(
  pricing: OrgPricing,
  cols: ScannedCardSqlColumns,
  stored: (key: CardPriceKey) => SQL,
): SQL<number | null> {
  const fields = PRICE_SOURCE_FIELDS[pricing.source];
  const value = (key: CardPriceKey) =>
    sql`COALESCE(${stored(key)}, ${savedCardPriceSql(key, cols)})`;
  return sql<
    number | null
  >`(COALESCE(CASE WHEN ${cols.isFoil} THEN ${value(fields.priceFoil)} END, ${value(fields.price)}) * ${conditionFactorSql(cols.condition, pricing.conditionMultipliers)})`;
}

export function scannedCardPriceSql(
  pricing: OrgPricing,
  cols: ScannedCardSqlColumns = COLLECTION_CARD_SQL_COLUMNS,
): SQL<number | null> {
  return scannedPriceFrom(pricing, cols, (key) =>
    storedCardPriceSql(key, cols),
  );
}

export function joinedScannedCardPriceSql(
  pricing: OrgPricing,
  cols: ScannedCardSqlColumns,
  cardPricesAlias: string,
): SQL<number | null> {
  return scannedPriceFrom(pricing, cols, (key) =>
    sql.raw(`${cardPricesAlias}.${CARD_PRICE_COLUMNS[key]}`),
  );
}

export function collectionCardPriceSql(
  pricing: OrgPricing,
): SQL<number | null> {
  return joinedScannedCardPriceSql(
    pricing,
    COLLECTION_CARD_SQL_COLUMNS,
    "card_prices",
  );
}

export function collectionCardPricesJoinOn(): SQL {
  return sql`${cardPrices.gameKey} = ${games.key} AND ${cardPrices.lang} = COALESCE(${collectionCards.card} ->> 'lang', ${collections.lang}) AND ${cardPrices.cardId} = ${collectionCards.cardId}`;
}

export function cardPricesJoinSql(
  cardPricesAlias: string,
  { gameKey, lang }: { gameKey: string | null; lang: string },
  { cardId, card }: Pick<ScannedCardSqlColumns, "cardId" | "card">,
): SQL {
  const cp = sql.raw(cardPricesAlias);
  return sql`LEFT JOIN card_prices ${cp} ON ${cp}.game_key = ${gameKey} AND ${cp}.lang = COALESCE(${card} ->> 'lang', ${lang}) AND ${cp}.card_id = ${cardId}`;
}

export function joinedCardPricesJsonSql(cardPricesAlias = "cp"): SQL {
  const cp = sql.raw(cardPricesAlias);
  return sql`jsonb_strip_nulls(jsonb_build_object(
      'price', ${cp}.price,
      'priceFoil', ${cp}.price_foil,
      'priceEur', ${cp}.price_eur,
      'priceEurFoil', ${cp}.price_eur_foil,
      'priceCardKingdom', ${cp}.price_card_kingdom,
      'priceCardKingdomFoil', ${cp}.price_card_kingdom_foil
    ) || COALESCE(${cp}.details, '{}'::jsonb))`;
}

function cardPricesAtScanJsonSql(savedCard: SQL): SQL {
  const pairs = CARD_PRICE_AT_SCAN_KEYS.map(
    (key) =>
      sql`${key}::text, CASE WHEN jsonb_typeof(${savedCard} -> ${key}::text) = 'number' THEN ${savedCard} -> ${key}::text END`,
  );
  return sql`jsonb_build_object('pricesAtScan', jsonb_strip_nulls(jsonb_build_object(${sql.join(pairs, sql`, `)})))`;
}

export function cardWithStoredPricesSql(
  card: SQL,
  cols: ScannedCardSqlColumns = COLLECTION_CARD_SQL_COLUMNS,
): SQL {
  const prices = storedCardPriceSelect(cols, joinedCardPricesJsonSql());
  return sql`(${card} || ${cardPricesAtScanJsonSql(card)} || COALESCE(${prices}, '{}'::jsonb))`;
}
