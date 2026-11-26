import type { PublicCardBrowseScope } from "./interfaces/public-cards";
import type { MonitorLinkClaims } from "./interfaces/monitor-links";
import type { OrgProfileScopeSource } from "./interfaces/org-profiles";
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
    hidesCardsHeldByReservations: claims.purpose === "trade",
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
    hidesCardsHeldByReservations: claims.purpose === "trade",
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
    hidesCardsHeldByReservations: false,
    showsPrices: claims.showsPrices,
    readsCacheKey: null,
  };
}

export function shopCatalogScope(
  claims: Pick<
    ShopCatalogClaims,
    "orgId" | "catalogGuid" | "collectionIds" | "storageLocationIds" | "showsPrices"
  >,
): PublicCardBrowseScope {
  return {
    orgId: claims.orgId,
    collectionIds: claims.collectionIds,
    storageLocationIds: claims.storageLocationIds,
    inventoryOnly: true,
    hidesCardsReservedByOpenPicks: true,
    hidesCardsHeldByReservations: false,
    showsPrices: claims.showsPrices,
    usesSellPrices: true,
    readsCacheKey: `${claims.catalogGuid}|${claims.orgId}`,
  };
}

export function orgProfileScope(profile: OrgProfileScopeSource): PublicCardBrowseScope {
  return {
    orgId: profile.orgId,
    collectionIds: profile.collectionIds,
    storageLocationIds: [],
    collectionCardIds: profile.collectionCardIds,
    ordersByCollectionCardIds: true,
    inventoryOnly: false,
    hidesCardsReservedByOpenPicks: false,
    hidesCardsHeldByReservations: false,
    showsPrices: profile.showsPrices,
    readsCacheKey: `${profile.handle}|${profile.orgId}`,
  };
}
