import type { PlayingCardWithDistance } from "./card.interface";
import type { CardCondition } from "./card-condition.interface";
import type { CardStatsAggregate } from "./collection-cards.interface";
import type { FieldMeta } from "./sort-bins.interface";
import type { PickListEntry, PickListEntryInput } from "./pick-list.interface";

export interface StorageLocation {
  guid: string;
  name: string;
  cardCount: number;
  totalValue: number;
  lastUsedAt: Date | null;
  createdAt: Date;
}

export interface CardStorageLocation {
  guid: string;
  name: string;
  position: number;
}

export interface StorageLocationCard {
  scanId: string;
  position: number;
  collectionGuid: string;
  collectionName: string;
  card: PlayingCardWithDistance;
  isFoil: boolean;
  foilType: string | null;
  stamp: string | null;
  condition: CardCondition;
  language: string | null;
  lowConfidenceMatch: boolean;
  hasAlternatives: boolean;
  corrected: boolean;
  reviewed: boolean;
  acquisitionCost: number | null;
  acquisitionCurrency: string | null;
}

export interface StorageLocationCardPage {
  cards: StorageLocationCard[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StorageLocationCardNeighbor {
  scanId: string;
  collectionGuid: string;
}

export interface StorageLocationCardContext {
  card: StorageLocationCard;
  index: number;
  total: number;
  previous: StorageLocationCardNeighbor | null;
  next: StorageLocationCardNeighbor | null;
}

export interface StoragePickListRequest {
  entries: PickListEntryInput[];
}

export interface StoragePickListCard extends StorageLocationSearchResult {
  lineIndex: number;
}

export interface StoragePickList {
  lines: PickListEntry[];
  cards: StoragePickListCard[];
}

export type StoragePickListRow =
  | { kind: "card"; entry: StorageLocationSearchResult; isPicked: boolean }
  | { kind: "missing"; line: PickListEntry; missingCount: number };

export interface StoredStoragePickList {
  decklist: string;
  pickedScanIds: string[];
}

export interface StoredStorageVerify {
  verifiedScanIds: string[];
  notInLocationCardNames: string[];
}

export interface StorageVerifyNameCount {
  name: string;
  count: number;
}

export interface ScanCheckCard {
  scanId: string;
  collectionGuid: string;
  card: { id: string; name: string };
}

export type ScanCheckMatch<T extends ScanCheckCard> =
  | { kind: "unchecked"; card: T }
  | { kind: "already-checked"; card: T };

export interface StorageRemoveCardsResult {
  removed: number;
}

export interface StorageLocationCardsSummary {
  stats: CardStatsAggregate;
  sortableFields: FieldMeta[];
}

export interface StorageLocationExportCard {
  scanId: string;
  position: number;
  collectionName: string;
  gameKey: string | null;
  card: PlayingCardWithDistance;
  isFoil: boolean;
  foilType: string | null;
  stamp: string | null;
  condition: CardCondition;
  language: string | null;
}

export interface StorageLocationSearchResult extends StorageLocationCard {
  locationGuid: string;
  locationName: string;
}

export interface EmptyBinOptions {
  locationGuid?: string;
  collectionGuid?: string;
}

export interface StorageLocationExportSummary {
  gameKeys: (string | null)[];
  scanIds: string[];
}
