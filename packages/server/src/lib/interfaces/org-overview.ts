import type { SQL } from "drizzle-orm";

export interface OrgOverviewValuesRow {
  collection_values: { guid: string | null; cardCount: number; value: number | null }[];
  top_card_scan_ids: string[];
}

export interface OrgOverviewCardsQuery {
  where?: SQL;
  orderBy: SQL;
  limit: number;
}
