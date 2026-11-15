import type { BinConfigSaveInput } from "@/lib/interfaces/bins";
import type { BinConfig, BinRuleGroup } from "@magic-vault/shared";

export function binSaveInputWithRules(
  bin: BinConfig,
  rules: BinRuleGroup,
): BinConfigSaveInput {
  return {
    binNumber: bin.binNumber,
    rules,
    isCatchAll: bin.isCatchAll,
    isOverride: bin.isOverride,
    overridePriority: bin.overridePriority ?? null,
    lowMatchPercent: bin.lowMatchPercent ?? null,
    maxCopies: bin.maxCopies ?? null,
    maxCopiesBy: bin.maxCopiesBy ?? null,
    maxCards: bin.maxCards ?? null,
    overflowBin: bin.overflowBin ?? null,
    isDisabled: bin.isDisabled,
    pickList: null,
    repackPriority: bin.repackPriority ?? null,
  };
}
