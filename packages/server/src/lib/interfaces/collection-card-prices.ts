import type { PlayingCard } from "@magic-vault/shared";

export interface StoredCardPriceRow {
  card_id: string;
  card: PlayingCard;
}

export interface PriceRefreshOptions {
  log: (msg: string) => void;
}
