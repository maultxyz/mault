import {
  cardColorSwatch,
  rarityHexColor,
  rarityLabel,
  sortRarities,
  type CardStatsAggregate,
} from "@magic-vault/shared";
import type { StatsBreakdown } from "@/lib/interfaces/stats";


export function toStatsBreakdown(
  aggregate: CardStatsAggregate,
  gameKey?: string | null,
): StatsBreakdown {
  const rarities = sortRarities(
    aggregate.rarities.map(({ key, count }) => ({
      key,
      count,
      label: rarityLabel(key),
      color: rarityHexColor(key, gameKey),
    })),
  );

  const colors = [...aggregate.colors]
    .sort((a, b) => b.count - a.count)
    .map(({ key, count }) => {
      const { label, hex } = cardColorSwatch(key);
      return { key, count, label, color: hex };
    });

  return {
    sets: [...aggregate.sets].sort((a, b) => b.value - a.value || b.count - a.count),
    rarities,
    colors,
    foilTypes: [...aggregate.foilTypes]
      .sort((a, b) => b.count - a.count)
      .map(({ key, count }) => ({ key, label: key, count })),
    conditions: aggregate.conditions ?? [],
    languages: [...(aggregate.languages ?? [])].sort((a, b) => b.count - a.count),
    foilCount: aggregate.foilCount ?? 0,
    nonFoilCount: aggregate.nonFoilCount ?? 0,
  };
}

