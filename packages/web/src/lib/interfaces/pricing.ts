import type { PlayingCard, PriceSource } from "@magic-vault/shared";
import type { ReactNode } from "react";

export interface PriceFormatter {
  source: PriceSource;
  priceOf(card: PlayingCard, isFoil?: boolean): number | null;
  format(value: number): string;
}

export interface PriceSourceProviderProps {
  value: PriceSource;
  children: ReactNode;
}
