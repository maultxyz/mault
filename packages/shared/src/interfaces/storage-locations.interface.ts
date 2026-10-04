import type { PlayingCardWithDistance } from "./card.interface";

export interface StorageLocation {
  guid: string;
  name: string;
  cardCount: number;
  totalValue: number;
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
}

export interface StorageLocationSearchResult extends StorageLocationCard {
  locationGuid: string;
  locationName: string;
}

export interface EmptyBinOptions {
  locationGuid?: string;
  collectionGuid?: string;
}
