import { colorSwatch, raritySwatch } from "@/lib/card-swatches";
import type { ScanStats } from "@/lib/interfaces/scanner";
import {
  cardPriceFor,
  type ConditionMultipliers,
  DEFAULT_PRICE_SOURCE,
  type CardStatsAggregate,
  type PriceSource,
  rarityLabel,
  type ScannedCard,
  sortRarities,
} from "@magic-vault/shared";

export function aggregateCards(
  cards: ScannedCard[],
  priceSource: PriceSource = DEFAULT_PRICE_SOURCE,
  conditionMultipliers?: ConditionMultipliers,
): CardStatsAggregate {
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
    const price =
      cardPriceFor(
        c,
        { isFoil: entry.isFoil, foilType: entry.foilType },
        priceSource,
        entry.condition,
        conditionMultipliers,
      ) ?? 0;

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

export function computeStats(
  cards: ScannedCard[],
  priceSource: PriceSource = DEFAULT_PRICE_SOURCE,
  conditionMultipliers?: ConditionMultipliers,
): ScanStats | null {
  return toScanStats(aggregateCards(cards, priceSource, conditionMultipliers));
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
