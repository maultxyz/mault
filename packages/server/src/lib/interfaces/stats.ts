import type {
  OrgOverviewCard,
  StatsActivityBucket,
  StatsCollectionRow,
  StatsGameRow,
  StatsPriceBucket,
  StatsTotals,
} from "@magic-vault/shared";

export interface StatsReportRow {
  totals: Omit<StatsTotals, "collectionCount">;
  activity: StatsActivityBucket[];
  price_buckets: Omit<StatsPriceBucket, "min" | "max">[];
  top_cards: OrgOverviewCard[];
  collections: StatsCollectionRow[];
  games: StatsGameRow[];
}
