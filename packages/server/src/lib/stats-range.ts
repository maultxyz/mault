import {
  STATS_DEFAULT_RANGE,
  STATS_RANGES,
  type StatsRange,
} from "@magic-vault/shared";

export function parseStatsRange(value: string | undefined): StatsRange {
  return STATS_RANGES.find((range) => range === value) ?? STATS_DEFAULT_RANGE;
}
