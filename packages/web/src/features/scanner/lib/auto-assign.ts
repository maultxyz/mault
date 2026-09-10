import {
  evaluateCardBin,
  getCardValue,
  type BinConfig,
  type BinRuleGroup,
  type FieldMeta,
  type PlayingCardWithDistance,
} from "@magic-vault/shared";

export function findAutoAssignTarget(
  card: PlayingCardWithDistance,
  configs: BinConfig[],
  fieldDefinitions: FieldMeta[],
  autoAssignField: string | null,
): { binNumber: number; rules: BinRuleGroup } | null {
  if (!autoAssignField) return null;

  const matched = evaluateCardBin(card, configs, fieldDefinitions);
  if (matched && !matched.isCatchAll) return null;

  const nextOpen = configs
    .filter((c) => !c.isCatchAll && c.rules.conditions.length === 0)
    .sort((a, b) => a.binNumber - b.binNumber)[0];
  if (!nextOpen) return null;

  const value = getCardValue(card, autoAssignField, fieldDefinitions);
  if (
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  ) {
    return null;
  }

  return {
    binNumber: nextOpen.binNumber,
    rules: {
      id: crypto.randomUUID(),
      combinator: "and",
      conditions: [
        {
          id: crypto.randomUUID(),
          field: autoAssignField,
          operator: "equals",
          value,
        },
      ],
    },
  };
}
