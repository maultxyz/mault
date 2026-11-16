import { colorSwatch, raritySwatch } from "@/lib/card-swatches";
import type { ScanStats } from "@/lib/interfaces/scanner";
import {
  type CardStatsAggregate,
  rarityLabel,
  sortRarities,
} from "@magic-vault/shared";

export function toScanStats(aggregate: CardStatsAggregate): ScanStats | null {
  if (aggregate.totalCount === 0) return null;

  return {
    totalCount: aggregate.totalCount,
    uniqueCount: aggregate.uniqueCount,
    totalValue: aggregate.totalValue,
    avgValue:
      aggregate.priceableCount > 0
        ? aggregate.totalValue / aggregate.priceableCount
        : 0,
    hasPricing: aggregate.priceableCount > 0,
    mostValuable: aggregate.mostValuable,
    sets: [...aggregate.sets].sort(
      (a, b) => b.value - a.value || b.count - a.count,
    ),
    rarities: sortRarities(
      aggregate.rarities.map(({ key, count }) => {
        const { bg, textClass } = raritySwatch(key);
        return {
          key,
          label: rarityLabel(key),
          bg,
          textClass,
          count,
        };
      }),
    ),
    colors: [...aggregate.colors]
      .sort((a, b) => b.count - a.count)
      .map(({ key, count }) => ({ key, ...colorSwatch(key), count })),
    foilTypes: [...aggregate.foilTypes]
      .sort((a, b) => b.count - a.count)
      .map(({ key, count }) => ({ key, label: key, count })),
  };
}

export function toDisplayStats(
  all: CardStatsAggregate,
  visible: CardStatsAggregate,
): ScanStats | null {
  const allStats = toScanStats(all);
  if (!allStats) return null;

  const visibleStats = toScanStats(visible);

  return {
    totalCount: visibleStats?.totalCount ?? 0,
    uniqueCount: visibleStats?.uniqueCount ?? 0,
    totalValue: visibleStats?.totalValue ?? 0,
    avgValue: visibleStats?.avgValue ?? 0,
    hasPricing: visibleStats?.hasPricing ?? false,
    mostValuable: visibleStats?.mostValuable ?? null,
    sets: allStats.sets,
    rarities: allStats.rarities,
    colors: allStats.colors,
    foilTypes: allStats.foilTypes,
  };
}
