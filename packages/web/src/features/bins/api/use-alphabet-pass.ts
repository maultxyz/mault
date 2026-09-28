import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import type { AlphabetPassState } from "@/lib/interfaces/bins";
import {
  clampAlphabetPass,
  getAlphabetPassCount,
  getAlphabetPassLetters,
  getNextAlphabetStep,
  getPreviousAlphabetStep,
} from "@magic-vault/shared";

export function useAlphabetPass(): AlphabetPassState {
  const { selectedSet, configs, effectiveMode, isModeDirty } = useBinConfigs();
  const passCount = getAlphabetPassCount(configs);
  const pass = clampAlphabetPass(configs, selectedSet?.alphabetPass ?? 0);
  const prefix = selectedSet?.alphabetPrefix ?? "";
  const letters = getAlphabetPassLetters(configs, pass, prefix);
  const step = { pass, prefix };
  const nextStep = getNextAlphabetStep(configs, step);
  const passLetters = [...letters.values()];

  return {
    isActive: !!selectedSet && effectiveMode.isAlphabetMode && !isModeDirty,
    prefix,
    nextStep,
    previousStep: getPreviousAlphabetStep(configs, step),
    pass,
    passCount,
    letters,
    from: passLetters[0],
    to: passLetters[passLetters.length - 1],
    isLastPass: nextStep === null,
  };
}
