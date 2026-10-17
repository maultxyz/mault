import type { CardCondition, PlayingCard, PriceSource } from "@magic-vault/shared";

export interface PriceFormatter {
  source: PriceSource;
  priceOf: (card: PlayingCard, isFoil?: boolean, condition?: CardCondition | null) => number | null;
  format: (value: number) => string;
}
