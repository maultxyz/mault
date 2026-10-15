import type { PlayingCardWithDistance } from "./card.interface";
import type { CardCondition } from "./card-condition.interface";

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
  condition: CardCondition;
  lowConfidenceMatch: boolean;
  hasAlternatives: boolean;
  corrected: boolean;
  reviewed: boolean;
}

export interface StorageLocationExportCard {
  scanId: string;
  position: number;
  collectionName: string;
  gameKey: string | null;
  card: PlayingCardWithDistance;
  isFoil: boolean;
  foilType: string | null;
  condition: CardCondition;
}

export interface StorageLocationSearchResult extends StorageLocationCard {
  locationGuid: string;
  locationName: string;
}

export interface EmptyBinOptions {
  locationGuid?: string;
  collectionGuid?: string;
}
