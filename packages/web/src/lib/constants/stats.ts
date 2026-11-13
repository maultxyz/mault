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
export const STATS_COLLECTION_COST_COLUMNS = ["costBasis", "margin"] as const;
export const STATS_VIEW_PARAM = "view";
export const STATS_OVERVIEW_VIEW = "overview";
export const STATS_VIEWS = [STATS_OVERVIEW_VIEW, "staff", "accuracy"] as const;
export const STATS_CHECK_PARAM = "check";
export const STATS_CHART_GRID_FRACTIONS = [0, 0.5, 1];
export const STATS_AREA_CHART = { width: 600, height: 200, top: 36, pillEdgePercent: 6 };
export const STATS_HERO_SPARKLINE = { width: 600, height: 240, top: 110, lineHeight: 90 };
export const STATS_DONUT = { size: 148, strokeWidth: 20, gap: 3, dimmedOpacity: 0.25 };
export const STATS_SPLIT_MAX_SEGMENTS = 6;
