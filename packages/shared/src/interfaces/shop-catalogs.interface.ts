import type { PublicCardBrowseInfo } from "./public-cards.interface";

export interface ShopCatalogSource {
  guid: string;
  name: string;
}

export interface ShopCatalog {
  guid: string;
  name: string;
  showsPrices: boolean;
  collections: ShopCatalogSource[];
  storageLocations: ShopCatalogSource[];
  linkToken: string | null;
  createdAt: string;
}

export interface ShopCatalogInput {
  name: string;
  showsPrices: boolean;
  collectionGuids: string[];
  storageLocationGuids: string[];
}

export interface ShopCatalogInfo extends PublicCardBrowseInfo {
  catalogGuid: string;
  name: string;
}

export interface ShopPhoto {
  url: string | null;
}
