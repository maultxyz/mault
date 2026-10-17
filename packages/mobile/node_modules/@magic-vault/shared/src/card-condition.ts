import {
  CARD_CONDITIONS,
  CONDITION_MULTIPLIER_MAX,
  CONDITION_MULTIPLIER_MIN,
  DEFAULT_CARD_CONDITION,
  DEFAULT_CONDITION_MULTIPLIERS,
} from "./constants/card-condition.constant";
import type {
  CardCondition,
  ConditionMultipliers,
} from "./interfaces/card-condition.interface";

export function isCardCondition(value: unknown): value is CardCondition {
  return CARD_CONDITIONS.includes(value as CardCondition);
}

export function toCardCondition(value: unknown): CardCondition {
  return isCardCondition(value) ? value : DEFAULT_CARD_CONDITION;
}

export function isConditionMultiplier(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= CONDITION_MULTIPLIER_MIN &&
    value <= CONDITION_MULTIPLIER_MAX
  );
}

export function toConditionMultipliers(value: unknown): ConditionMultipliers {
  const input =
    value && typeof value === "object"
      ? (value as Partial<Record<CardCondition, unknown>>)
      : {};
  const result = { ...DEFAULT_CONDITION_MULTIPLIERS };
  for (const condition of CARD_CONDITIONS) {
    if (condition === DEFAULT_CARD_CONDITION) continue;
    const candidate = input[condition];
    if (isConditionMultiplier(candidate)) result[condition] = candidate;
  }
  return result;
}

export function conditionFactor(
  condition: CardCondition | null | undefined,
  multipliers: ConditionMultipliers = DEFAULT_CONDITION_MULTIPLIERS,
): number {
  return multipliers[toCardCondition(condition)] / 100;
}
