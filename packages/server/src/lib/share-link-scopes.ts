import type { PublicCardBrowseScope } from "./interfaces/public-cards";
import type { MonitorLinkClaims } from "./interfaces/monitor-links";
import type {
  CardShareLinkClaims,
  ShopCatalogClaims,
  StorageShareLinkClaims,
} from "./interfaces/share-tokens";

export function collectionShareLinkScope(claims: MonitorLinkClaims): PublicCardBrowseScope {
  return {
    orgId: claims.orgId,
    collectionIds: [claims.collectionId],
    storageLocationIds: [],
    inventoryOnly: false,
    hidesCardsReservedByOpenPicks: claims.purpose === "trade",
    showsPrices: claims.showsPrices,
    readsCacheKey: null,
  };
}

export function storageShareLinkScope(claims: StorageShareLinkClaims): PublicCardBrowseScope {
  return {
    orgId: claims.orgId,
    collectionIds: [],
    storageLocationIds: [claims.locationId],
    inventoryOnly: false,
    hidesCardsReservedByOpenPicks: claims.purpose === "trade",
    showsPrices: claims.showsPrices,
    readsCacheKey: null,
  };
}

export function cardShareLinkScope(claims: CardShareLinkClaims): PublicCardBrowseScope {
  return {
    orgId: claims.orgId,
    collectionIds: [claims.collectionId],
    storageLocationIds: [],
    collectionCardIds: [claims.collectionCardId],
    inventoryOnly: false,
    hidesCardsReservedByOpenPicks: false,
    showsPrices: claims.showsPrices,
    readsCacheKey: null,
  };
}

export function shopCatalogScope(claims: ShopCatalogClaims): PublicCardBrowseScope {
  return {
    orgId: claims.orgId,
    collectionIds: claims.collectionIds,
    storageLocationIds: claims.storageLocationIds,
    inventoryOnly: true,
    hidesCardsReservedByOpenPicks: true,
    showsPrices: claims.showsPrices,
    readsCacheKey: `${claims.catalogGuid}|${claims.orgId}`,
  };
}
