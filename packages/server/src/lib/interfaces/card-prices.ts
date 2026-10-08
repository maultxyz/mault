import type { PlayingCard } from "@magic-vault/shared";
import type { AnyColumn, SQL } from "drizzle-orm";
import type {
  CARD_PRICE_COLUMNS,
  CARD_PRICE_DETAIL_KEYS,
} from "../constants/card-prices";

export type CardPriceKey = keyof typeof CARD_PRICE_COLUMNS;

export type CardPriceDetailKey = (typeof CARD_PRICE_DETAIL_KEYS)[number];

export type CardPriceDetails = Partial<Pick<PlayingCard, CardPriceDetailKey>>;

export interface StoredCardPrices {
  price: number | null;
  priceFoil: number | null;
  priceEur: number | null;
  priceEurFoil: number | null;
  priceCardKingdom: number | null;
  priceCardKingdomFoil: number | null;
  details: CardPriceDetails | null;
}

export interface CardPriceScope {
  gameKey: string;
  lang: string;
}

export interface ScannedCardSqlColumns {
  card: SQL | AnyColumn;
  isFoil: SQL | AnyColumn;
  cardId: SQL | AnyColumn;
  collectionId: SQL | AnyColumn;
}

export interface CardPriceRefreshOptions {
  log: (msg: string) => void;
  onlyMissing: boolean;
}
