import type {
  OrgOverviewCard,
  StatsActivityBucket,
  StatsCollectionRow,
  StatsGameRow,
  StatsPriceBucket,
  StatsTotals,
} from "@magic-vault/shared";

export interface StatsTopCardRow extends OrgOverviewCard {
  gameKey: string | null;
  cardLang: string;
}

export interface StatsReportRow {
  totals: Omit<StatsTotals, "collectionCount">;
  activity: StatsActivityBucket[];
  price_buckets: Omit<StatsPriceBucket, "min" | "max">[];
  top_cards: StatsTopCardRow[];
  collections: StatsCollectionRow[];
  games: StatsGameRow[];
}
