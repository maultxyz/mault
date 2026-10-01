import { PRICE_SOURCE_FIELDS, type PriceSource } from "@magic-vault/shared";
import { sql, type SQL } from "drizzle-orm";
import { collectionCards } from "../db/schema";

function jsonPrice(key: string): SQL {
  return sql`(CASE WHEN jsonb_typeof(${collectionCards.card} -> ${key}::text) = 'number' THEN (${collectionCards.card} ->> ${key}::text)::float8 END)`;
}

export function scannedCardPriceSql(source: PriceSource): SQL<number | null> {
  const fields = PRICE_SOURCE_FIELDS[source];
  return sql<number | null>`COALESCE(CASE WHEN ${collectionCards.isFoil} THEN ${jsonPrice(fields.priceFoil)} END, ${jsonPrice(fields.price)})`;
}
