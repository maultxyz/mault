import type { StatusTone } from "@/lib/interfaces/theme";
import type { TradeScanNotice } from "@/lib/interfaces/trade";

export const TRADE_LINK_BASE_PATHS = {
  collection: "monitor-link",
  storage: "storage-share-link",
} as const;
export const TRADE_LINK_CARDS_PAGE_SIZE = 48;
export const TRADE_LINK_INFO_QUERY_KEY = "trade-link-info";
export const TRADE_LINK_CARDS_QUERY_KEY = "trade-link-cards";
export const TRADE_CARD_THUMBNAIL_WIDTH = 40;
export const TRADE_SCAN_NOTICE_TONES: Record<TradeScanNotice["kind"], StatusTone> = {
  added: "success",
  "no-match": "warning",
  failed: "destructive",
};
