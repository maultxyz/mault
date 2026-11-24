import { sql } from "drizzle-orm";
import { collectionCards } from "../../db/schema";
import type { ScannedCardSqlColumns } from "../interfaces/card-prices";

export const CARD_PRICE_COLUMNS = {
  price: "price",
  priceFoil: "price_foil",
  priceEur: "price_eur",
  priceEurFoil: "price_eur_foil",
  priceCardKingdom: "price_card_kingdom",
  priceCardKingdomFoil: "price_card_kingdom_foil",
} as const;

export const CARD_PRICE_DETAIL_KEYS = [
  "priceRange",
  "priceRangeFoil",
  "cardmarketPrice",
  "cardmarketPriceFoil",
  "cardKingdomPrice",
  "cardKingdomPriceFoil",
  "finishPrices",
  "stampPrices",
  "priceByCondition",
  "priceFoilByCondition",
  "listingCountByCondition",
  "listingCountFoilByCondition",
  "foilOnlyFoilType",
] as const;

export const SHARE_LINK_HIDDEN_PRICE_KEYS: ReadonlySet<string> = new Set([
  ...Object.keys(CARD_PRICE_COLUMNS),
  ...CARD_PRICE_DETAIL_KEYS.filter((key) => key !== "foilOnlyFoilType"),
  "pricesAtScan",
  "acquisitionCost",
  "acquisitionCurrency",
  "sellPrice",
]);

export const CARD_PRICE_REFRESH_BATCH_SIZE = 1000;
export const CARD_PRICE_REFRESH_PROGRESS_LOG_EVERY_BATCHES = 20;

export const COLLECTION_CARD_SQL_COLUMNS: ScannedCardSqlColumns = {
  savedPrices: {
    price: collectionCards.cardSavedPrice,
    priceFoil: collectionCards.cardSavedPriceFoil,
    priceEur: collectionCards.cardSavedPriceEur,
    priceEurFoil: collectionCards.cardSavedPriceEurFoil,
    priceCardKingdom: collectionCards.cardSavedPriceCardKingdom,
    priceCardKingdomFoil: collectionCards.cardSavedPriceCardKingdomFoil,
  },
  cardLang: collectionCards.cardLang,
  isFoil: collectionCards.isFoil,
  foilType: collectionCards.foilType,
  stamp: collectionCards.stamp,
  condition: collectionCards.condition,
  cardId: collectionCards.cardId,
  collectionId: collectionCards.collectionId,
};

export const CC_ALIAS_SQL_COLUMNS: ScannedCardSqlColumns = {
  savedPrices: {
    price: sql`cc.card_saved_price`,
    priceFoil: sql`cc.card_saved_price_foil`,
    priceEur: sql`cc.card_saved_price_eur`,
    priceEurFoil: sql`cc.card_saved_price_eur_foil`,
    priceCardKingdom: sql`cc.card_saved_price_card_kingdom`,
    priceCardKingdomFoil: sql`cc.card_saved_price_card_kingdom_foil`,
  },
  cardLang: sql`cc.card_lang`,
  isFoil: sql`cc.is_foil`,
  foilType: sql`cc.foil_type`,
  stamp: sql`cc.stamp`,
  condition: sql`cc.condition`,
  cardId: sql`cc.card_id`,
  collectionId: sql`cc.collection_id`,
};

export const STORED_SCANNED_PRICE_ALIAS = "stored_scanned_price";

export const INVENTORY_GROUP_ALIAS = "ig";

export const INVENTORY_GROUP_SQL_COLUMNS: ScannedCardSqlColumns = {
  savedPrices: {
    price: sql`ig.card_saved_price`,
    priceFoil: sql`ig.card_saved_price_foil`,
    priceEur: sql`ig.card_saved_price_eur`,
    priceEurFoil: sql`ig.card_saved_price_eur_foil`,
    priceCardKingdom: sql`ig.card_saved_price_card_kingdom`,
    priceCardKingdomFoil: sql`ig.card_saved_price_card_kingdom_foil`,
  },
  cardLang: sql`ig.card_lang`,
  isFoil: sql`ig.is_foil`,
  foilType: sql`ig.foil_type`,
  stamp: sql`ig.stamp`,
  condition: sql`ig.condition`,
  cardId: sql`ig.card_id`,
  collectionId: sql`ig.collection_id`,
};

export const INVENTORY_GROUP_KEY_COLUMNS = [
  "collection_id",
  "card_id",
  "card_lang",
  "is_foil",
  "foil_type",
  "stamp",
  "condition",
  "card_saved_price",
  "card_saved_price_foil",
  "card_saved_price_eur",
  "card_saved_price_eur_foil",
  "card_saved_price_card_kingdom",
  "card_saved_price_card_kingdom_foil",
] as const;
