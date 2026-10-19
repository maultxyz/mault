import { randomUUID } from "node:crypto";
import {
  countCopiesInBin,
  evaluateCardBin,
  evaluateScanOnlyBin,
  findLowMatchCatchAll,
  getCardValue,
  isOverflowTarget,
  isRulesMode,
  matchesCatchAllRules,
  resolveOverflowBin,
  type BinConfig,
  type BinRoute,
  type BinRuleGroup,
  type BinSet,
  type FieldMeta,
  type PlayingCardWithDistance,
  type SourceCard,
} from "@magic-vault/shared";

export function unsupportedPresetMessage(set: BinSet): string | null {
  if (set.isChaosMode) {
    return "This preset is in chaos mode. Pi scanning runs a rules preset.";
  }
  if (set.isRepackMode) {
    return "This preset is in repack mode. Pi scanning runs a rules preset.";
  }
  if (set.isAlphabetMode) {
    return "This preset is in alphabetical mode. Pi scanning runs a rules preset.";
  }
  return null;
}

export function findAutoAssignTarget(
  card: PlayingCardWithDistance,
  configs: BinConfig[],
  fieldDefinitions: FieldMeta[],
  autoAssignField: string | null,
): { binNumber: number; rules: BinRuleGroup } | null {
  if (!autoAssignField) return null;
  if (findLowMatchCatchAll(card, configs)) return null;
  if (matchesCatchAllRules(card, configs, fieldDefinitions)) return null;

  const matched = evaluateCardBin(card, configs, fieldDefinitions);
  if (matched && !matched.isCatchAll) return null;

  const nextOpen = configs
    .filter(
      (bin) =>
        !bin.isCatchAll &&
        !bin.isDisabled &&
        bin.rules.conditions.length === 0 &&
        !isOverflowTarget(configs, bin.binNumber),
    )
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
      id: randomUUID(),
      combinator: "and",
      conditions: [
        {
          id: randomUUID(),
          field: autoAssignField,
          operator: "equals",
          value,
        },
      ],
    },
  };
}

export function chooseRulesBin(
  card: PlayingCardWithDistance,
  set: BinSet,
  configs: BinConfig[],
  fieldDefinitions: FieldMeta[],
  contents: { binNumber?: number | null; scannedAt: number; card: SourceCard }[],
  countInBin: (bin: BinConfig) => number,
  isBinFull: (bin: BinConfig) => boolean,
): BinConfig | undefined {
  const lowMatch = findLowMatchCatchAll(card, configs);
  if (lowMatch) {
    return isRulesMode(set)
      ? resolveOverflowBin(lowMatch, configs, isBinFull)
      : lowMatch;
  }
  if (set.scanOnly) {
    return evaluateScanOnlyBin(configs, set.scanOnlyBin);
  }
  return evaluateCardBin(
    card,
    configs,
    fieldDefinitions,
    set.autoAssignField
      ? undefined
      : (bin) => countCopiesInBin(contents, bin, card, fieldDefinitions),
    countInBin,
    isBinFull,
  );
}

export function routeForBin(
  binNumber: number,
  routes: BinRoute[],
  moduleCount: number,
): BinRoute {
  const found = routes.find((route) => route.binNumber === binNumber);
  if (found) return found;
  return { binNumber, module: Math.max(1, moduleCount), direction: "bottom" };
}
