import { TRADE_OFFERS_QUERY_KEY } from "@/lib/constants/trade-offers";
import { WIDGET_SUMMARY_QUERY_KEY } from "@/lib/constants/widgets";

export const QUERY_STALE_MS = 30_000;
export const QUERY_GC_MS = 15 * 60_000;
export const STATS_STALE_MS = 60_000;
export const QUERY_RETRY_COUNT = 1;
export const OVERVIEW_REFRESH_MS = 60_000;
export const SCAN_IMAGE_STALE_MS = 5 * 60_000;
export const SCAN_SAVE_REFRESH_THROTTLE_MS = 3000;
export const PERSISTED_ORG_QUERY_ROOT_KEYS: ReadonlySet<string> = new Set([
  "org-overview",
  WIDGET_SUMMARY_QUERY_KEY,
  "collections",
  TRADE_OFFERS_QUERY_KEY,
  "org-settings",
  "billing",
  "storage-locations",
]);
export const PERSISTED_GLOBAL_QUERY_ROOT_KEYS: ReadonlySet<string> = new Set(["games"]);
export const QUERY_CACHE_SNAPSHOT_MAX_AGE_MS = 7 * 24 * 60 * 60_000;
export const QUERY_CACHE_SNAPSHOT_WRITE_DELAY_MS = 2000;
