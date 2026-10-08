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

export const COLLECTION_CARD_SQL_COLUMNS: ScannedCardSqlColumns = {
  card: collectionCards.card,
  isFoil: collectionCards.isFoil,
  cardId: collectionCards.cardId,
  collectionId: collectionCards.collectionId,
};

export const CC_ALIAS_SQL_COLUMNS: ScannedCardSqlColumns = {
  card: sql`cc.card`,
  isFoil: sql`cc.is_foil`,
  cardId: sql`cc.card_id`,
  collectionId: sql`cc.collection_id`,
};
