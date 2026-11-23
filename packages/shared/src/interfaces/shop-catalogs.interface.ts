import type { PublicCardBrowseInfo } from "./public-cards.interface";

export interface ShopCatalogSource {
  guid: string;
  name: string;
}

export interface ShopCatalog {
  guid: string;
  name: string;
  showsPrices: boolean;
  isPublic: boolean;
  allowsReservations?: boolean;
  reservationsRequireAccount?: boolean;
  reservationHoldDays?: number;
  collections: ShopCatalogSource[];
  storageLocations: ShopCatalogSource[];
  linkToken: string | null;
  shortCode: string;
  shortUrl?: string | null;
  createdAt: string;
}

export interface ShopCatalogInput {
  name: string;
  showsPrices: boolean;
  isPublic: boolean;
  allowsReservations?: boolean;
  reservationsRequireAccount?: boolean;
  reservationHoldDays?: number;
  collectionGuids: string[];
  storageLocationGuids: string[];
}

export interface ShopCatalogInfo extends PublicCardBrowseInfo {
  catalogGuid: string;
  name: string;
  allowsReservations?: boolean;
  reservationsRequireAccount?: boolean;
  reservationHoldDays?: number;
}

export interface ShopPhoto {
  url: string | null;
}
