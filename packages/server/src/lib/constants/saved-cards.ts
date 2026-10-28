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
] as const;

export const SAVED_CARD_READ_TIME_KEYS = [
  "raw",
  "pricesAtScan",
  "purchaseLinks",
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
