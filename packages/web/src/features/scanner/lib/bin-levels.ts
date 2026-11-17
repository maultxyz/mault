import {
  BIN_LEVEL_FULL_PERCENT,
  BIN_LEVEL_WARNING_PERCENT,
} from "@/lib/constants/scanner";
import type {
  BinFillLevel,
  BinLevelStatus,
  BinLevelSummary,
} from "@/lib/interfaces/scanner";

export function binLevelStatus(level: BinFillLevel): BinLevelStatus {
  if (level.capacity == null) return "normal";
  if (level.percent >= BIN_LEVEL_FULL_PERCENT) return "full";
  if (level.percent >= BIN_LEVEL_WARNING_PERCENT) return "warning";
  return "normal";
}

export function summarizeBinLevels(levels: BinFillLevel[]): BinLevelSummary {
  const withCapacity = levels.filter((level) => level.capacity != null);
  const fullest = withCapacity.reduce<BinFillLevel | null>(
    (best, level) => (!best || level.percent > best.percent ? level : best),
    null,
  );
  return {
    totalCards: levels.reduce((sum, level) => sum + level.count, 0),
    fullest: fullest && fullest.count > 0 ? fullest : null,
    needsEmptying: levels.filter((level) => binLevelStatus(level) !== "normal")
      .length,
  };
}
