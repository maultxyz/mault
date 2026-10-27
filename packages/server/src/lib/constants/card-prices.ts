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
] as const;

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
  condition: sql`cc.condition`,
  cardId: sql`cc.card_id`,
  collectionId: sql`cc.collection_id`,
};
