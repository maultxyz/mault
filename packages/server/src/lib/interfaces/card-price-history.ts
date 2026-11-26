import type { Transaction } from "../../db";
import type { cardPriceHistory } from "../../db/schema";

export type CardPriceHistoryWriter = Pick<Transaction, "insert">;

export type CardPriceHistoryRow = typeof cardPriceHistory.$inferSelect;

export interface CardPriceHistoryKey {
  gameKey: string;
  lang: string;
  cardId: string;
}

export interface ChangedCardPrices extends CardPriceHistoryKey {
  price: number | null;
  priceFoil: number | null;
  priceEur: number | null;
  priceEurFoil: number | null;
  priceCardKingdom: number | null;
  priceCardKingdomFoil: number | null;
}
