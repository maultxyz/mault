import type {
  CardCondition,
  ConditionMultipliers,
  OrgPricing,
} from "../interfaces/card-condition.interface";
import { DEFAULT_PRICE_SOURCE } from "./price-source.constant";

export const CARD_CONDITIONS: CardCondition[] = ["NM", "LP", "MP", "HP", "DMG"];

export const DEFAULT_CARD_CONDITION: CardCondition = "NM";

export const DEFAULT_CONDITION_MULTIPLIERS: ConditionMultipliers = {
  NM: 100,
  LP: 90,
  MP: 80,
  HP: 70,
  DMG: 60,
};

export const CONDITION_MULTIPLIER_MIN = 0;

export const CONDITION_MULTIPLIER_MAX = 100;

export const DEFAULT_ORG_PRICING: OrgPricing = {
  source: DEFAULT_PRICE_SOURCE,
  conditionMultipliers: DEFAULT_CONDITION_MULTIPLIERS,
};
