import type { cardKingdomPrices } from "../../db/schema";

export interface CardKingdomPriceListEntry {
  id: number;
  sku: string;
  scryfall_id: string | null;
  url: string | null;
  name: string;
  variation: string;
  edition: string;
  is_foil: "true" | "false";
  price_retail: string | null;
  qty_retail: number | null;
  price_buy: string | null;
  qty_buying: number | null;
}

export interface CardKingdomPriceListFile {
  meta: { created_at: string; base_url: string };
  data: CardKingdomPriceListEntry[];
}

export interface CardKingdomSyncResult {
  prices: number;
  removed: number;
  skipped: boolean;
}

export type CardKingdomPriceRow = typeof cardKingdomPrices.$inferSelect;
