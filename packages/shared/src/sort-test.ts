import {
  evaluateCondition,
  getAlphabetPassLetters,
  getCardValue,
  isOverrideBin,
} from "./evaluate-bin";
import { resolveScanBin } from "./scan-routing";
import { isRuleGroup } from "./interfaces/sort-bins.interface";
import type { SourceCard } from "./interfaces/card.interface";
import type { BinRuleGroup, FieldMeta } from "./interfaces/sort-bins.interface";
import type {
  SortTestExplanation,
  SortTestGroupCheck,
  SortTestInput,
  SortTestReason,
} from "./interfaces/sort-test.interface";

export function checkRuleGroup(
  card: SourceCard,
  group: BinRuleGroup,
  fieldDefinitions: FieldMeta[],
): SortTestGroupCheck {
  const items = group.conditions.map((item) =>
    isRuleGroup(item)
      ? checkRuleGroup(card, item, fieldDefinitions)
      : {
          condition: item,
          passed: evaluateCondition(card, item, fieldDefinitions),
          cardValue: getCardValue(card, item.field, fieldDefinitions),
        },
  );
  const passed =
    items.length > 0 &&
    (group.combinator === "and"
      ? items.every((item) => item.passed)
      : items.some((item) => item.passed));
  return { group, passed, items };
}

export function explainSortTest({
  card,
  binSet,
  configs,
  fieldDefinitions,
}: SortTestInput): SortTestExplanation {
  const decision = resolveScanBin(card, {
    binSet,
    configs,
    fieldDefinitions,
    binContents: [],
    countCardsInBin: () => 0,
    isBinFull: () => false,
    binRoom: () => Number.POSITIVE_INFINITY,
    createRuleId: () => "sort-test",
  });
  const bin = decision.bin;
  const binChecks = configs
    .filter((config) => config.rules.conditions.length > 0 && (config.isCatchAll || !config.isDisabled))
    .map((config) => {
      const check = checkRuleGroup(card, config.rules, fieldDefinitions);
      return {
        binNumber: config.binNumber,
        isCatchAll: !!config.isCatchAll,
        isOverride: isOverrideBin(config),
        matched: check.passed,
        check,
      };
    });
  const pickListMatch = decision.action === "route" ? decision.pickListMatch : null;
  const autoAssignTarget = decision.action === "route" ? decision.autoAssignTarget : null;
  const matchedChecks = binChecks.filter((binCheck) => binCheck.matched);
  const matchedOverride = matchedChecks.find((binCheck) => binCheck.isOverride);
  const matchedBinNumber =
    (matchedOverride ?? matchedChecks.find((binCheck) => !binCheck.isCatchAll))?.binNumber ?? null;

  let reason: SortTestReason;
  if (!bin) reason = "noBin";
  else if (pickListMatch) reason = "pickList";
  else if (autoAssignTarget) reason = "autoAssign";
  else if (binSet?.scanOnly) reason = "scanOnly";
  else if (binSet?.isChaosMode) reason = "chaos";
  else if (binSet?.isAlphabetMode) reason = "alphabet";
  else if (binSet?.isRepackMode) reason = "repack";
  else if (matchedBinNumber == null) reason = "noRuleMatched";
  else if (matchedBinNumber !== bin.binNumber) reason = "overflow";
  else if (bin.isCatchAll) reason = "catchAllRules";
  else if (matchedOverride) reason = "override";
  else reason = "rules";

  return {
    binNumber: bin?.binNumber ?? null,
    reason,
    matchedBinNumber,
    alphabetLetter:
      binSet?.isAlphabetMode && bin
        ? (getAlphabetPassLetters(configs, binSet.alphabetPass, binSet.alphabetPrefix).get(bin.binNumber) ?? null)
        : null,
    pickListEntryName: pickListMatch?.entry.name ?? null,
    binChecks,
  };
}
