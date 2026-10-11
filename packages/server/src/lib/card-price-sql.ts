import { PRICE_SOURCE_FIELDS, type PriceSource } from "@magic-vault/shared";
import { sql, type AnyColumn, type SQL } from "drizzle-orm";
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
    WHERE cp.game_key = pg.key AND cp.lang = pc.lang AND cp.card_id = ${cols.cardId}
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

export function storedCardPriceDetailSql(
  path: SQL,
  cols: ScannedCardSqlColumns = COLLECTION_CARD_SQL_COLUMNS,
): SQL {
  return storedCardPriceSelect(cols, sql`cp.details #> ${path}`);
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

function scannedPriceFrom(
  source: PriceSource,
  cols: ScannedCardSqlColumns,
  stored: (key: CardPriceKey) => SQL,
): SQL<number | null> {
  const fields = PRICE_SOURCE_FIELDS[source];
  const value = (key: CardPriceKey) =>
    sql`COALESCE(${stored(key)}, ${savedCardPriceSql(key, cols)})`;
  return sql<
    number | null
  >`COALESCE(CASE WHEN ${cols.isFoil} THEN ${value(fields.priceFoil)} END, ${value(fields.price)})`;
}

export function scannedCardPriceSql(
  source: PriceSource,
  cols: ScannedCardSqlColumns = COLLECTION_CARD_SQL_COLUMNS,
): SQL<number | null> {
  return scannedPriceFrom(source, cols, (key) => storedCardPriceSql(key, cols));
}

export function joinedScannedCardPriceSql(
  source: PriceSource,
  cols: ScannedCardSqlColumns,
  cardPricesAlias: string,
): SQL<number | null> {
  return scannedPriceFrom(source, cols, (key) =>
    sql.raw(`${cardPricesAlias}.${CARD_PRICE_COLUMNS[key]}`),
  );
}

export function cardPricesJoinSql(
  cardPricesAlias: string,
  { gameKey, lang }: { gameKey: string | null; lang: string },
  cardId: SQL | AnyColumn,
): SQL {
  const cp = sql.raw(cardPricesAlias);
  return sql`LEFT JOIN card_prices ${cp} ON ${cp}.game_key = ${gameKey} AND ${cp}.lang = ${lang} AND ${cp}.card_id = ${cardId}`;
}

export function cardWithStoredPricesSql(
  card: SQL,
  cols: ScannedCardSqlColumns = COLLECTION_CARD_SQL_COLUMNS,
): SQL {
  const prices = storedCardPriceSelect(
    cols,
    sql`jsonb_strip_nulls(jsonb_build_object(
      'price', cp.price,
      'priceFoil', cp.price_foil,
      'priceEur', cp.price_eur,
      'priceEurFoil', cp.price_eur_foil,
      'priceCardKingdom', cp.price_card_kingdom,
      'priceCardKingdomFoil', cp.price_card_kingdom_foil
    ) || COALESCE(cp.details, '{}'::jsonb))`,
  );
  return sql`(${card} || COALESCE(${prices}, '{}'::jsonb))`;
}
