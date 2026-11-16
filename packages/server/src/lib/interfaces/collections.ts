import type {
  CardPriceSortCurrency,
  FieldMeta,
  GroupedScannedCard,
  OrgPricing,
  PlayingCardWithDistance,
} from "@magic-vault/shared";
import type { SQL } from "drizzle-orm";
import type { Transaction } from "../../db";
import type { CatalogJoinScope } from "./saved-cards";

export interface CardStatsSource {
  scope: CatalogJoinScope;
  joins: SQL;
  where: SQL;
}

export interface CardSortScope {
  fieldDefinitions: FieldMeta[];
  pricing: OrgPricing | null;
}

export type ParsedCardSort =
  | { kind: "field"; meta: FieldMeta; dir: "asc" | "desc" }
  | { kind: "price"; currency: CardPriceSortCurrency; pricing: OrgPricing; dir: "asc" | "desc" };

export interface CardsCollection extends CardSortScope {
  id: number;
  name: string;
  gameKey: string | null;
  gameName: string | null;
  lang: string;
  pricing: OrgPricing;
}

export interface BinLimitStatus {
  binNumber: number;
  capacity: number;
  count: number;
}

export interface CollectionCardRow {
  guid: string;
  card: unknown;
  scanned_at_ms: number;
  bin_number: number | null;
  is_foil: boolean;
  foil_type: string | null;
  stamp: string | null;
  condition: string;
  language: string | null;
  is_downloaded: boolean;
  alternative_matches: unknown;
  is_corrected: boolean;
  low_confidence_match: boolean;
  is_reviewed: boolean;
  location_guid?: string | null;
  location_name?: string | null;
  location_position?: number | null;
}

export interface CardsPageTotals {
  total_entries: number;
  total_cards: number;
}

export interface CardsPageRow extends CollectionCardRow, CardsPageTotals {
  scan_ids: string[];
  quantity: number;
  stored_count: number;
}

export interface CardsPageRows {
  rows: CardsPageRow[];
  totals: CardsPageTotals | undefined;
}

export interface CollectionCardsPageEntries {
  items: GroupedScannedCard[];
  totalEntries: number;
  totalCards: number;
}

export type TransactionRunner = <T>(fn: (tx: Transaction) => Promise<T>) => Promise<T>;

export interface NotifyCardScannedParams {
  orgId: string;
  collectionGuid: string;
  isNewSession: boolean;
  card: PlayingCardWithDistance;
  isFoil?: boolean;
  foilType?: string;
  collectionName: string | undefined;
  gameName: string | undefined;
  gameId: number | null;
  capturedImageUrl?: string;
}
