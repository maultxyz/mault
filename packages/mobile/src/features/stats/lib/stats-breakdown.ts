import {
  cardColorSwatch,
  fallbackSwatchHex,
  RARITY_TIER_HEX_COLORS,
  rarityLabel,
  rarityTier,
  sortRarities,
  type CardStatsAggregate,
} from "@magic-vault/shared";
import type { StatsBreakdown } from "@/lib/interfaces/stats";


export function toStatsBreakdown(aggregate: CardStatsAggregate): StatsBreakdown {
  const rarities = sortRarities(
    aggregate.rarities.map(({ key, count }) => {
      const tier = rarityTier(key);
      return {
        key,
        count,
        label: rarityLabel(key),
        color: tier ? RARITY_TIER_HEX_COLORS[tier] : fallbackSwatchHex(key),
      };
    }),
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
  };
}

