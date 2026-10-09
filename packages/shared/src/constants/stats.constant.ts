export const STATS_RANGES = ["7d", "30d", "90d", "1y"] as const;
export const STATS_DEFAULT_RANGE = "30d";
export const STATS_RANGE_DAYS: Record<(typeof STATS_RANGES)[number], number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
};
export const STATS_WEEKLY_BUCKET_MIN_DAYS = 120;
export const STATS_TOP_CARDS_LIMIT = 10;
export const STATS_PRICE_BUCKETS = [
  { key: "under1", min: 0, max: 1 },
  { key: "1to5", min: 1, max: 5 },
  { key: "5to20", min: 5, max: 20 },
  { key: "20to100", min: 20, max: 100 },
  { key: "over100", min: 100, max: null },
] as const;
