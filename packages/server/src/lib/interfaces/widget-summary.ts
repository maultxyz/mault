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
