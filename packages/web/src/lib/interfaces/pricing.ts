import type {
  CardCondition,
  ConditionMultipliers,
  OrgPricing,
  PlayingCard,
  PriceSource,
} from "@magic-vault/shared";
import type { ReactNode } from "react";

export interface PriceFormatter {
  source: PriceSource;
  conditionMultipliers: ConditionMultipliers;
  priceOf(
    card: PlayingCard,
    isFoil?: boolean,
    condition?: CardCondition,
  ): number | null;
  format(value: number): string;
}

export interface PriceSourceProviderProps {
  value: OrgPricing;
  children: ReactNode;
}
