export const STATS_SYNC_KEY_PREFIX = "mvstats_";
export const STATS_SYNC_PUSH_PATH = "/stats-sync/push";
export const STATS_SYNC_MAX_DAYS_PER_REQUEST = 366;
export const STATS_SYNC_MAX_SCANS_PER_DAY = 100_000;
export const STATS_SYNC_EARLIEST_DAY = "2024-01-01";
export const STATS_SYNC_KEY_MAX_LENGTH = 200;
export const STATS_SYNC_ERROR_CODES = [
  "invalidKey",
  "unreachable",
  "rejected",
] as const;
export const LEADERBOARD_INCLUDE_SELF_HOSTED_PARAM = "includeSelfHosted";
