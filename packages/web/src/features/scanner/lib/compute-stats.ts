import { CARD_COLOR_SWATCHES } from "@/lib/constants/colors";
import { RARITY_LABELS, RARITY_ORDER } from "@/lib/constants/rarity";
import type { ScanStats } from "@/lib/interfaces/scanner";
import type { CardStatsAggregate, ScannedCard } from "@magic-vault/shared";

export type { ScanStats };

function capitalize(value: string): string {
  return value.length > 0
    ? value.charAt(0).toUpperCase() + value.slice(1)
    : value;
}

function sortRarities<T extends { key: string; count: number }>(
  entries: T[],
): T[] {
  return [...entries].sort((a, b) => {
    const orderA = RARITY_ORDER.indexOf(a.key);
    const orderB = RARITY_ORDER.indexOf(b.key);
    if (orderA !== -1 && orderB !== -1) return orderA - orderB;
    if (orderA !== -1) return -1;
    if (orderB !== -1) return 1;
    return b.count - a.count;
  });
}

export function aggregateCards(cards: ScannedCard[]): CardStatsAggregate {
  let totalValue = 0;
  let priceableCount = 0;
  const setMap = new Map<string, CardStatsAggregate["sets"][number]>();
  const rarityMap = new Map<string, number>();
  const colorMap = new Map<string, number>();
  const foilTypeMap = new Map<string, number>();
  let mostValuable: { name: string; price: number } | null = null;
  const uniqueCards = new Set<string>();

  for (const entry of cards) {
    const c = entry.card;
    const price = (entry.isFoil ? c.priceFoil : c.price) ?? c.price ?? 0;

    uniqueCards.add(c.id);

    if (price > 0) {
      totalValue += price;
      priceableCount++;
    }

    if (price > 0 && (!mostValuable || price > mostValuable.price)) {
      mostValuable = { name: c.name, price };
    }

    const existing = setMap.get(c.set);
    if (existing) {
      existing.count++;
      existing.value += price;
    } else {
      setMap.set(c.set, {
        code: c.set,
        name: c.setName,
        count: 1,
        value: price,
      });
    }

    if (c.rarity) {
      rarityMap.set(c.rarity, (rarityMap.get(c.rarity) ?? 0) + 1);
    }

    for (const color of c.colorIdentity) {
      colorMap.set(color, (colorMap.get(color) ?? 0) + 1);
    }

    const foilLabel = entry.foilType ?? (entry.isFoil ? "Foil" : null);
    if (foilLabel) {
      foilTypeMap.set(foilLabel, (foilTypeMap.get(foilLabel) ?? 0) + 1);
    }
  }

  const toCounts = (map: Map<string, number>) =>
    Array.from(map.entries()).map(([key, count]) => ({ key, count }));

  return {
    totalCount: cards.length,
    uniqueCount: uniqueCards.size,
    totalValue,
    priceableCount,
    mostValuable,
    sets: Array.from(setMap.values()),
    rarities: toCounts(rarityMap),
    colors: toCounts(colorMap),
    foilTypes: toCounts(foilTypeMap),
  };
}

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
      aggregate.rarities.map(({ key, count }) => ({
        key,
        label: RARITY_LABELS[key] ?? capitalize(key),
        count,
      })),
    ),
    colors: [...aggregate.colors]
      .sort((a, b) => b.count - a.count)
      .map(({ key, count }) => ({
        key,
        label: CARD_COLOR_SWATCHES[key]?.label ?? key,
        bg: CARD_COLOR_SWATCHES[key]?.bg ?? key.toLowerCase(),
        count,
      })),
    foilTypes: [...aggregate.foilTypes]
      .sort((a, b) => b.count - a.count)
      .map(({ key, count }) => ({ key, label: key, count })),
  };
}

export function computeStats(cards: ScannedCard[]): ScanStats | null {
  return toScanStats(aggregateCards(cards));
}

// Totals follow the visible (filtered) cards, while the facet breakdowns
// stay collection-wide so filter options don't vanish as filters apply.
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

export function computeDisplayStats(
  allCards: ScannedCard[],
  visibleCards: ScannedCard[],
): ScanStats | null {
  return toDisplayStats(aggregateCards(allCards), aggregateCards(visibleCards));
}
