import type { BinSet, BinSetMode } from "./interfaces/sort-bins.interface";

export function binSetMode(set: BinSet | null | undefined): BinSetMode {
  if (!set) return "rules";
  if (set.isRepackMode) return "repack";
  if (set.autoAssignField) return "auto-assign";
  if (set.isAlphabetMode) return "alphabet";
  if (set.isChaosMode) return "chaos";
  if (set.scanOnly) return "scan-only";
  return "rules";
}
