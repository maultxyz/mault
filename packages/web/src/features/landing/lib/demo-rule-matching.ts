import { DEMO_RULE_FIELDS } from "@/lib/constants/landing";
import type { DemoRuleCondition } from "@/lib/interfaces/landing";
import type { PlayingCardWithDistance } from "@magic-vault/shared";

function cardMatchesCondition(
  card: PlayingCardWithDistance,
  condition: DemoRuleCondition,
): boolean {
  const cardValues = DEMO_RULE_FIELDS[condition.field]
    .readCardValues(card)
    .map((value) => value.trim().toLowerCase());
  const hasValue = cardValues.includes(condition.value.toLowerCase());
  return condition.operator === "is" ? hasValue : !hasValue;
}

export function cardMatchesDemoRule(
  card: PlayingCardWithDistance,
  conditions: DemoRuleCondition[],
  combinator: "and" | "or",
): boolean {
  return combinator === "and"
    ? conditions.every((condition) => cardMatchesCondition(card, condition))
    : conditions.some((condition) => cardMatchesCondition(card, condition));
}
