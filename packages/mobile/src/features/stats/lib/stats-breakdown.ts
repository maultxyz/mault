import {
  cardColorSwatch,
  fallbackSwatchHex,
  LEADERBOARD_OWN_ORG_AFTER,
  RARITY_TIER_HEX_COLORS,
  rarityLabel,
  rarityTier,
  sortRarities,
  type CardStatsAggregate,
  type Leaderboard,
} from "@magic-vault/shared";
import type { LeaderboardRow, StatsBreakdown } from "@/lib/interfaces/stats";

export function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

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

export function buildLeaderboardRows(leaderboard: Leaderboard): LeaderboardRow[] {
  const rows = leaderboard.entries.map((entry, index) => ({ key: `entry-${index}`, entry }));
  if (leaderboard.entries.some((entry) => entry.isOwnOrg)) return rows;
  const own = { key: "own", entry: leaderboard.ownEntry };
  return [...rows.slice(0, LEADERBOARD_OWN_ORG_AFTER), own, ...rows.slice(LEADERBOARD_OWN_ORG_AFTER)];
}
