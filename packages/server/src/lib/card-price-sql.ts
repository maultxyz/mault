import { PRICE_SOURCE_FIELDS, type PriceSource } from "@magic-vault/shared";
import { sql, type SQL } from "drizzle-orm";
import {
  CARD_PRICE_COLUMNS,
  COLLECTION_CARD_SQL_COLUMNS,
} from "./constants/card-prices";
import type {
  CardPriceKey,
  ScannedCardSqlColumns,
} from "./interfaces/card-prices";

function storedCardPriceSelect(
  cols: ScannedCardSqlColumns,
  select: SQL,
): SQL {
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
  return sql<number | null>`${storedCardPriceSelect(cols, sql.raw(`cp.${CARD_PRICE_COLUMNS[key]}`))}`;
}

export function storedCardPriceDetailSql(
  path: SQL,
  cols: ScannedCardSqlColumns = COLLECTION_CARD_SQL_COLUMNS,
): SQL {
  return storedCardPriceSelect(cols, sql`cp.details #> ${path}`);
}

function savedCardPriceSql(key: CardPriceKey, cols: ScannedCardSqlColumns): SQL {
  return sql`(CASE WHEN jsonb_typeof(${cols.card} -> ${key}::text) = 'number' THEN (${cols.card} ->> ${key}::text)::float8 END)`;
}

export function cardPriceValueSql(
  key: CardPriceKey,
  cols: ScannedCardSqlColumns = COLLECTION_CARD_SQL_COLUMNS,
): SQL<number | null> {
  return sql<number | null>`COALESCE(${storedCardPriceSql(key, cols)}, ${savedCardPriceSql(key, cols)})`;
}

export function scannedCardPriceSql(
  source: PriceSource,
  cols: ScannedCardSqlColumns = COLLECTION_CARD_SQL_COLUMNS,
): SQL<number | null> {
  const fields = PRICE_SOURCE_FIELDS[source];
  return sql<number | null>`COALESCE(CASE WHEN ${cols.isFoil} THEN ${cardPriceValueSql(fields.priceFoil, cols)} END, ${cardPriceValueSql(fields.price, cols)})`;
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
      'priceEurFoil', cp.price_eur_foil
    ) || COALESCE(cp.details, '{}'::jsonb))`,
  );
  return sql`(${card} || COALESCE(${prices}, '{}'::jsonb))`;
}
