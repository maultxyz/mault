import { sql } from "drizzle-orm";

export const NUMERIC_PREFIX_SQL_PATTERN = String.raw`^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)`;

export const CARD_STATS_KEYS_CTE = "card_stats_keys";

export const CARD_STATS_PRICES_CTE = "card_stats_prices";

export const CARD_STATS_CATALOG_CTE = "card_stats_catalog";

export const CARD_FILTER_LANGUAGE_SQL = sql`COALESCE(cc.language, cc.card_lang, (SELECT language_collection.lang FROM collections language_collection WHERE language_collection.id = cc.collection_id))`;

export const CARD_SEARCH_FIELDS = [
  "name",
  "setName",
  "set",
  "typeLine",
  "collectorNumber",
  "text",
];

export const COLLECTION_PREVIEW_SCAN_WINDOW = 50;
