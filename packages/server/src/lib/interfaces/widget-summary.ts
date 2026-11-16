import type { WidgetSummary } from "@magic-vault/shared";

export interface CollectionValueRow {
  guid: string;
  name: string;
  cardCount: number;
  totalValue: number;
}

export interface PreviousCollectionValues {
  day: string;
  byCollectionGuid: Map<string, { cardCount: number; totalValue: number }>;
}

export interface WidgetCollectionCardPick {
  scanId: string;
  collectionGuid: string;
  isTopCard: boolean;
  isBiggestPriceRise: boolean;
  isBiggestPriceDrop: boolean;
  isInDailyShuffle: boolean;
  dayRank: number;
}

export interface WidgetCardPicksRow {
  collection_values: { guid: string; name: string; cardCount: number; totalValue: number }[];
  collection_picks: WidgetCollectionCardPick[];
  org_biggest_price_rise_scan_id: string | null;
  org_biggest_price_drop_scan_id: string | null;
  org_daily_shuffle_scan_ids: string[];
  needs_review_count: number;
  review_scan_ids: string[];
}

export interface WidgetScanActivityRow {
  collection_guid: string;
  session_started_at: string;
  last_scan_at: string;
  session_scan_count: number;
  window_scan_count: number;
}

export interface LoadedWidgetSummary {
  summary: WidgetSummary;
  currency: string;
  collectionValues: CollectionValueRow[];
}
