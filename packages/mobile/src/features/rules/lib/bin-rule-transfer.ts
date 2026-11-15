import type { BinConfig, BinRuleGroup } from "@magic-vault/shared";
import type { BinSaveInput } from "@/lib/interfaces/rules";

export function binSaveInputWithRules(
  bin: BinConfig,
  rules: BinRuleGroup,
  gameGuid: string | undefined,
): BinSaveInput {
  return {
    binNumber: bin.binNumber,
    gameGuid,
    rules,
    isCatchAll: bin.isCatchAll ?? false,
    isDisabled: bin.isDisabled ?? false,
    overflowBin: bin.overflowBin ?? null,
    isOverride: bin.isOverride,
    overridePriority: bin.overridePriority ?? null,
    lowMatchPercent: bin.lowMatchPercent ?? null,
    maxCopies: bin.maxCopies ?? null,
    maxCopiesBy: bin.maxCopiesBy ?? null,
    maxCards: bin.maxCards ?? null,
    pickList: null,
  };
}
