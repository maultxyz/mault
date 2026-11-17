import type {
  CardCondition,
  CardFinish,
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
    finish?: boolean | CardFinish,
    condition?: CardCondition,
  ): number | null;
  priceAtScanOf(
    card: PlayingCard,
    finish?: boolean | CardFinish,
    condition?: CardCondition,
  ): number | null;
  format(value: number): string;
}

export interface PriceSourceProviderProps {
  value: OrgPricing;
  children: ReactNode;
}
