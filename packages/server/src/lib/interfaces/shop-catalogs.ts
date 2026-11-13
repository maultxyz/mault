import type { ShopCatalogSource } from "@magic-vault/shared";

export interface ShopCatalogSourceRow extends ShopCatalogSource {
  id: number;
}

export interface ShopCatalogSourceRows {
  collections: ShopCatalogSourceRow[];
  storageLocations: ShopCatalogSourceRow[];
}

export interface StoredShopPhotoRow {
  shopPhotoKey: string | null;
  shopPhotoDataUrl: string | null;
}
