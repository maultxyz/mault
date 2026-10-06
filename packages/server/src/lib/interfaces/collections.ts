import type { PlayingCardWithDistance } from "@magic-vault/shared";
import type { Transaction } from "../../db";

export interface BinLimitStatus {
  binNumber: number;
  cardLimit: number;
  count: number;
}

export interface CollectionCardRow {
  guid: string;
  card: unknown;
  scanned_at_ms: number;
  bin_number: number | null;
  is_foil: boolean;
  foil_type: string | null;
  is_downloaded: boolean;
  alternative_matches: unknown;
  is_corrected: boolean;
  needs_review: boolean;
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
