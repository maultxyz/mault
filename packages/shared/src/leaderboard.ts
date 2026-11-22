import {
  DEFAULT_LEADERBOARD_METRIC,
  DEFAULT_LEADERBOARD_PERIOD,
  LEADERBOARD_METRIC_PARAM,
  LEADERBOARD_METRICS,
  LEADERBOARD_PERIOD_PARAM,
  LEADERBOARD_PERIODS,
} from "./constants/leaderboard.constant";
import { LEADERBOARD_INCLUDE_SELF_HOSTED_PARAM } from "./constants/stats-sync.constant";
import type {
  Leaderboard,
  LeaderboardMetric,
  LeaderboardPeriod,
  LeaderboardQuery,
  LeaderboardRow,
} from "./interfaces/leaderboard.interface";

export function buildLeaderboardRows(leaderboard: Leaderboard): LeaderboardRow[] {
  const rows = leaderboard.entries.map((entry, index) => ({
    key: `entry-${index}`,
    entry,
  }));
  if (leaderboard.entries.some((entry) => entry.isOwnOrg)) return rows;
  return [...rows, { key: "own", entry: leaderboard.ownEntry }];
}

export function parseLeaderboardMetric(
  value: string | null | undefined,
): LeaderboardMetric {
  return LEADERBOARD_METRICS.find((metric) => metric === value) ??
    DEFAULT_LEADERBOARD_METRIC;
}

export function parseLeaderboardPeriod(
  value: string | null | undefined,
): LeaderboardPeriod {
  return LEADERBOARD_PERIODS.find((period) => period === value) ??
    DEFAULT_LEADERBOARD_PERIOD;
}

export function leaderboardMetricCountsSelfHosted(
  metric: LeaderboardMetric,
): boolean {
  return metric === "totalScans";
}

export function leaderboardQueryString({
  metric,
  period,
  includeSelfHosted,
}: LeaderboardQuery): string {
  const params = new URLSearchParams();
  if (metric !== DEFAULT_LEADERBOARD_METRIC) {
    params.set(LEADERBOARD_METRIC_PARAM, metric);
  }
  if (period !== DEFAULT_LEADERBOARD_PERIOD) {
    params.set(LEADERBOARD_PERIOD_PARAM, period);
  }
  if (includeSelfHosted && leaderboardMetricCountsSelfHosted(metric)) {
    params.set(LEADERBOARD_INCLUDE_SELF_HOSTED_PARAM, "true");
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
