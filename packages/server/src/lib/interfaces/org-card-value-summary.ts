import type { OrgPricing } from "@magic-vault/shared";
import type { WidgetCollectionCardPick } from "./widget-summary";

export interface OrgCardValueSummaryCollection {
  guid: string | null;
  name: string;
  cardCount: number;
  value: number | null;
}

export interface OrgCardValueSummaryRow {
  collection_values: OrgCardValueSummaryCollection[];
  top_card_scan_ids: string[];
  collection_picks: WidgetCollectionCardPick[];
  org_biggest_price_rise_scan_id: string | null;
  org_biggest_price_drop_scan_id: string | null;
  org_daily_shuffle_scan_ids: string[];
  needs_review_count: number;
  review_scan_ids: string[];
}

export interface OrgCardValueSummary extends OrgCardValueSummaryRow {
  pricing: OrgPricing;
  day: string;
}
