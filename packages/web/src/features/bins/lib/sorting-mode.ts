import type { BinModeDraft } from "@/lib/interfaces/bins";
import { SCAN_RULE_GAME_FIELD, type BinSetMode } from "@magic-vault/shared";

export function sortingModeOfDraft(mode: BinModeDraft): BinSetMode {
  if (mode.isRepackMode) return "repack";
  if (mode.autoAssignField === SCAN_RULE_GAME_FIELD) return "game-sort";
  if (mode.autoAssignField) return "auto-assign";
  if (mode.isAlphabetMode) return "alphabet";
  if (mode.isChaosMode) return "chaos";
  if (mode.scanOnly) return "scan-only";
  return "rules";
}

function leaveSortingModePatch(mode: BinSetMode): Partial<BinModeDraft> {
  switch (mode) {
    case "game-sort":
      return { autoAssignField: null, matchGameKeys: [] };
    case "auto-assign":
      return { autoAssignField: null };
    case "scan-only":
      return { scanOnly: false };
    case "repack":
      return { isRepackMode: false };
    case "alphabet":
      return { isAlphabetMode: false };
    case "chaos":
      return { isChaosMode: false };
    case "rules":
      return {};
  }
}

function enterSortingModePatch(
  mode: BinSetMode,
  firstAutoAssignField: string | null,
): Partial<BinModeDraft> {
  switch (mode) {
    case "game-sort":
      return {
        autoAssignField: SCAN_RULE_GAME_FIELD,
        skipSaving: true,
        isResortMode: false,
      };
    case "auto-assign":
      return { autoAssignField: firstAutoAssignField };
    case "scan-only":
      return { scanOnly: true };
    case "repack":
      return { isRepackMode: true };
    case "alphabet":
      return { isAlphabetMode: true };
    case "chaos":
      return { isChaosMode: true };
    case "rules":
      return {};
  }
}

export function sortingModeChangePatch(
  currentMode: BinSetMode,
  nextMode: BinSetMode,
  firstAutoAssignField: string | null,
): Partial<BinModeDraft> {
  if (currentMode === nextMode) return {};
  return {
    ...leaveSortingModePatch(currentMode),
    ...enterSortingModePatch(nextMode, firstAutoAssignField),
  };
}
