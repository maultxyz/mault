export const STATS_PATH = "/app/stats";
export const STATS_COLLECTION_PARAM = "collection";
export const STATS_RANGE_PARAM = "range";
export const STATS_ALL_COLLECTIONS = "all";
export const STATS_ACTIVITY_METRICS = ["count", "value"] as const;
export const STATS_COLLECTION_METRICS = [
  "totalValue",
  "cardCount",
  "scansInRange",
] as const;
export const STATS_COLLECTION_TABLE_COLUMNS = [
  "name",
  "cardCount",
  "uniqueCount",
  "totalValue",
  "avgValue",
  "scansInRange",
  "lastScanAt",
] as const;
export const STATS_BAR_LIST_LIMIT = 10;
