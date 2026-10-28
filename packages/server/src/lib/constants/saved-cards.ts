import { sql } from "drizzle-orm";
import type {
  CardCatalogColumns,
  CatalogSqlColumns,
} from "../interfaces/saved-cards";

export const CARD_CATALOG_ALIAS = "cat";

export const CATALOG_CC_ALIAS_COLUMNS: CatalogSqlColumns = {
  setName: sql`COALESCE(cat.set_name, cc.card_set_name)`,
  rarity: sql`COALESCE(cat.rarity, cc.card_rarity)`,
  colorIdentity: sql`COALESCE(cat.color_identity, cc.card_color_identity)`,
  searchText: sql`COALESCE(cat.search_text, cc.card_search_text)`,
  imageSmall: sql`COALESCE(cat.image_small, cc.card_image_small)`,
  data: sql`cat.data`,
};

export const SAVED_CARD_SCAN_KEYS = [
  "id",
  "lang",
  "distance",
  "confidence",
  "price",
  "priceFoil",
  "priceRange",
  "priceRangeFoil",
  "priceEur",
  "priceEurFoil",
  "cardmarketPrice",
  "cardmarketPriceFoil",
  "priceCardKingdom",
  "priceCardKingdomFoil",
  "cardKingdomPrice",
  "cardKingdomPriceFoil",
  "pricesAtScan",
  "purchaseLinks",
  "finishPrices",
] as const;

export const SAVED_CARD_READ_TIME_KEYS = [
  "raw",
  "pricesAtScan",
  "purchaseLinks",
  "finishPrices",
] as const;

export const SAVED_ALTERNATIVE_KEYS = [
  "id",
  "lang",
  "name",
  "set",
  "setName",
  "collectorNumber",
  "image",
  "distance",
  "confidence",
] as const;

export const EMPTY_CARD_CATALOG_COLUMNS: CardCatalogColumns = {
  setName: null,
  rarity: null,
  colorIdentity: [],
  searchText: null,
  imageSmall: null,
};

export const CARD_CATALOG_BACKFILL_BATCH_SIZE = 500;

export const SAVED_CARD_SLIM_BATCH_SIZE = 200;

export const CARD_FINISH_VECTOR_BATCH_SIZE = 500;

export const CARD_FINISH_IMAGE_FETCH_DELAY_MS = 200;

export const CARD_FINISH_IMAGE_TIMEOUT_MS = 20_000;

export const CARD_FINISH_PROGRESS_LOG_EVERY = 50;

export const CARD_FINISH_VECTOR_LANG = "en";
