import type { CardStatsAggregate } from "./collection-cards.interface";
import type { OrgOverviewCard } from "./org-overview.interface";
import type { STATS_RANGES } from "../constants/stats.constant";

export type StatsRange = (typeof STATS_RANGES)[number];
export type StatsBucketUnit = "day" | "week";
export type StatsScope = "org" | "collection";

export interface StatsActivityBucket {
  start: string;
  count: number;
  value: number;
}

export interface StatsPriceBucket {
  key: string;
  min: number;
  max: number | null;
  count: number;
  value: number;
}

export interface StatsCollectionRow {
  guid: string;
  name: string;
  gameName: string | null;
  cardCount: number;
  uniqueCount: number;
  totalValue: number;
  avgValue: number;
  scansInRange: number;
  valueAddedInRange: number;
  lastScanAt: string | null;
}

export interface StatsGameRow {
  key: string | null;
  name: string | null;
  cardCount: number;
  totalValue: number;
}

export interface StatsTotals {
  collectionCount: number;
  cardCount: number;
  uniqueCount: number;
  totalValue: number;
  avgValue: number;
  priceableCount: number;
  foilCount: number;
  needsReviewCount: number;
  correctedCount: number;
  scansInRange: number;
  valueAddedInRange: number;
}

export interface StatsReport {
  scope: StatsScope;
  range: StatsRange;
  bucket: StatsBucketUnit;
  totals: StatsTotals;
  activity: StatsActivityBucket[];
  priceBuckets: StatsPriceBucket[];
  topCards: OrgOverviewCard[];
  collections: StatsCollectionRow[];
  games: StatsGameRow[];
  breakdown: CardStatsAggregate | null;
}
