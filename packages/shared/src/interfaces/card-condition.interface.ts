import type { PriceSource } from "./price-source.interface";

export type CardCondition = "NM" | "LP" | "MP" | "HP" | "DMG";

export type ConditionMultipliers = Record<CardCondition, number>;

export interface OrgPricing {
  source: PriceSource;
  conditionMultipliers: ConditionMultipliers;
}
