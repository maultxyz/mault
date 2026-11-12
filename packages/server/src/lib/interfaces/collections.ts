import type { FieldMeta, PlayingCardWithDistance } from "@magic-vault/shared";
import type { SQL } from "drizzle-orm";
import type { Transaction } from "../../db";
import type { CatalogJoinScope } from "./saved-cards";

export interface CardStatsSource {
  scope: CatalogJoinScope;
  joins: SQL;
  where: SQL;
}

export interface CardsCollection {
  id: number;
  name: string;
  gameKey: string | null;
  gameName: string | null;
  lang: string;
  fieldDefinitions: FieldMeta[];
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
