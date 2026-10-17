import {
  LEADERBOARD_OWN_ORG_AFTER,
  type CardStatsAggregate,
  type Leaderboard,
} from "@magic-vault/shared";
import {
  STATS_CARD_COLORS,
  STATS_COLOR_NAME_COLORS,
  STATS_FALLBACK_PALETTE,
  STATS_RARITY_ABBREVIATIONS,
  STATS_RARITY_LABELS,
  STATS_RARITY_ORDER,
  STATS_RARITY_PATTERNS,
  STATS_RARITY_TIER_COLORS,
  STATS_RARITY_TIER_ORDER,
} from "@/lib/constants/stats";
import type { LeaderboardRow, StatsBreakdown } from "@/lib/interfaces/stats";

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[_-]+/g, " ");
}

function capitalize(value: string): string {
  return value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function fallbackColor(key: string): string {
  let hash = 0;
  for (const char of normalizeKey(key)) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return STATS_FALLBACK_PALETTE[Math.abs(hash) % STATS_FALLBACK_PALETTE.length];
}

function rarityTier(key: string) {
  const normalized = normalizeKey(key);
  return (
    STATS_RARITY_ABBREVIATIONS[normalized] ??
    STATS_RARITY_PATTERNS.find(([pattern]) => pattern.test(normalized))?.[1] ??
    null
  );
}

function rarityRank(key: string): number {
  const tier = rarityTier(key);
  return tier ? STATS_RARITY_TIER_ORDER.indexOf(tier) : STATS_RARITY_TIER_ORDER.length;
}

export function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

export function toStatsBreakdown(aggregate: CardStatsAggregate): StatsBreakdown {
  const rarities = aggregate.rarities
    .map(({ key, count }) => {
      const tier = rarityTier(key);
      return {
        key,
        count,
        label: STATS_RARITY_LABELS[key] ?? capitalize(key),
        color: tier ? STATS_RARITY_TIER_COLORS[tier] : fallbackColor(key),
      };
    })
    .sort((a, b) => {
      const orderA = STATS_RARITY_ORDER.indexOf(a.key);
      const orderB = STATS_RARITY_ORDER.indexOf(b.key);
      if (orderA !== -1 && orderB !== -1) return orderA - orderB;
      return rarityRank(a.key) - rarityRank(b.key) || b.count - a.count;
    });

  const colors = [...aggregate.colors]
    .sort((a, b) => b.count - a.count)
    .map(({ key, count }) => {
      const known = STATS_CARD_COLORS[key];
      const named = STATS_COLOR_NAME_COLORS[normalizeKey(key)];
      return {
        key,
        count,
        label: known?.label ?? key,
        color: known?.color ?? named ?? fallbackColor(key),
      };
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
