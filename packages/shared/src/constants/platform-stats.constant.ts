export const PLATFORM_STAT_KEYS = [
  "scannedCards",
  "scansLast24Hours",
  "devices",
  "users",
  "organizations",
  "collections",
] as const;

export const DEFAULT_PLATFORM_STAT_KEYS = [
  "scannedCards",
  "devices",
  "users",
  "organizations",
] as const;

export const PLATFORM_STATS_SCRIPT_COMMAND =
  "node packages/server/dist/scripts/post-platform-stats.js";
