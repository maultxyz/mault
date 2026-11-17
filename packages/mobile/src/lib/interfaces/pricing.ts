import type { CardCondition, CardFinish, PlayingCard, PriceSource } from "@magic-vault/shared";

export interface PriceFormatter {
  source: PriceSource;
  priceOf: (
    card: PlayingCard,
    finish?: boolean | CardFinish,
    condition?: CardCondition | null,
  ) => number | null;
  format: (value: number) => string;
}
