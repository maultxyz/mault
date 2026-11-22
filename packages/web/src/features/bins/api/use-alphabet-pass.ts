import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import type { AlphabetPassState } from "@/lib/interfaces/bins";
import {
  clampAlphabetPass,
  getAlphabetPass,
  getAlphabetPassCount,
  getAlphabetStepPile,
  getNextAlphabetStep,
  getPreviousAlphabetStep,
} from "@magic-vault/shared";

export function useAlphabetPass(): AlphabetPassState {
  const { selectedSet, configs, effectiveMode, isModeDirty } = useBinConfigs();
  const passCount = getAlphabetPassCount(configs);
  const pass = clampAlphabetPass(configs, selectedSet?.alphabetPass ?? 0);
  const prefix = selectedSet?.alphabetPrefix ?? "";
  const alphabetPass = getAlphabetPass(configs, pass, prefix);
  const groups = alphabetPass?.groups ?? [];
  const step = { pass, prefix };
  const nextStep = getNextAlphabetStep(configs, step);

  return {
    isActive: !!selectedSet && effectiveMode.isAlphabetMode && !isModeDirty,
    prefix,
    nextStep,
    previousStep: getPreviousAlphabetStep(configs, step),
    pass,
    passCount,
    labels: new Map(groups.map((group) => [group.binNumber, group.label])),
    singleLetterLabels: groups
      .filter((group) => group.isSingleLetter)
      .map((group) => group.label),
    sortsOneLetterPerBin: alphabetPass?.sortsOneLetterPerBin ?? true,
    from: alphabetPass?.from,
    to: alphabetPass?.to,
    nextPile: nextStep ? getAlphabetStepPile(configs, nextStep) : null,
    isLastPass: nextStep === null,
  };
}
