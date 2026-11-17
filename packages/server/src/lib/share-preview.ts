import {
  EMPTY_PUBLIC_CARD_FILTERS,
  cardPriceFor,
  formatPrice,
  type PublicCard,
  type PublicCardSort,
} from "@magic-vault/shared";
import { db, type Transaction } from "../db";
import { verifyCardShareLink } from "./card-share-links";
import {
  SHARE_PREVIEW_CACHE_MAX_ENTRIES,
  SHARE_PREVIEW_CACHE_TTL_MS,
} from "./constants/share-preview";
import type { PublicCardBrowseScope } from "./interfaces/public-cards";
import type {
  SharePreview,
  SharePreviewImage,
  SharePreviewListSummary,
  SharePreviewRequest,
} from "./interfaces/share-preview";
import { verifyMonitorLink } from "./monitor-links";
import { orgHasFeature } from "./plan-config";
import { loadOrgPricing } from "./price-source";
import { loadPublicCardGames, loadPublicCardPage } from "./public-card-browse";
import {
  cardShareLinkScope,
  collectionShareLinkScope,
  shopCatalogScope,
  storageShareLinkScope,
} from "./share-link-scopes";
import {
  cardSharePreviewText,
  collectionSharePreviewText,
  shopCatalogSharePreviewText,
  storageSharePreviewText,
  unavailableSharePreview,
} from "./share-preview-html";
import { loadShopPhotoRow, resolveShopPhotoUrl } from "./shop-photo";
import { verifyPublicShopCatalog, verifyShopCatalogLink } from "./shop-catalogs";
import { verifyStorageShareLink } from "./storage-share-links";
import { createTtlCache } from "./ttl-cache";

const sharePreviewCache = createTtlCache<SharePreview>({
  ttlMs: SHARE_PREVIEW_CACHE_TTL_MS,
  maxEntries: SHARE_PREVIEW_CACHE_MAX_ENTRIES,
});

async function loadLeadingCard(
  tx: Transaction,
  scope: PublicCardBrowseScope,
): Promise<{ card: PublicCard | null; formattedPrice: string | null }> {
  const pricing = await loadOrgPricing(tx, scope.orgId);
  const sort: PublicCardSort = scope.showsPrices ? "price-desc" : "newest";
  const page = await loadPublicCardPage(
    tx,
    scope,
    {
      search: "",
      sort,
      gameKey: null,
      filters: EMPTY_PUBLIC_CARD_FILTERS,
      pageSize: 1,
      requestedPage: 1,
    },
    pricing,
  );
  const card = page.cards[0] ?? null;
  if (!card || !scope.showsPrices) return { card, formattedPrice: null };
  const price = cardPriceFor(
    card.card,
    { isFoil: card.isFoil, foilType: card.foilType, stamp: card.stamp },
    pricing.source,
    card.condition,
    pricing.conditionMultipliers,
  );
  return { card, formattedPrice: price == null ? null : formatPrice(price, pricing.source) };
}

function cardArtImage(card: PublicCard | null): SharePreviewImage | null {
  const imageUrl = card?.card.image?.normal;
  if (!card || !imageUrl) return null;
  return { url: imageUrl, alt: card.card.name, width: null, height: null };
}

async function loadShopPhotoImage(
  tx: Transaction,
  orgId: string,
  shopName: string,
): Promise<SharePreviewImage | null> {
  if (!(await orgHasFeature(tx, orgId, "businessTools"))) return null;
  const photoUrl = await resolveShopPhotoUrl(await loadShopPhotoRow(tx, orgId));
  return photoUrl
    ? { url: photoUrl, alt: shopName, width: null, height: null }
    : null;
}

async function loadListSummary(
  tx: Transaction,
  scope: PublicCardBrowseScope,
  subjectName: string,
  isTradeLink: boolean,
): Promise<SharePreviewListSummary> {
  const { cardCount, games } = await loadPublicCardGames(tx, scope);
  return { subjectName, cardCount, games, isTradeLink };
}

async function loadCollectionPreview(
  request: SharePreviewRequest,
): Promise<SharePreview | null> {
  const claims = request.token ? await verifyMonitorLink(request.token) : null;
  if (!claims || claims.collectionGuid !== request.subjectGuid) return null;
  const scope = collectionShareLinkScope(claims);
  return db.transaction(async (tx) => {
    const summary = await loadListSummary(
      tx,
      scope,
      claims.collectionName,
      claims.purpose === "trade",
    );
    const { card } = await loadLeadingCard(tx, scope);
    return {
      ...collectionSharePreviewText(summary),
      pathWithQuery: request.pathWithQuery,
      isIndexable: false,
      image: cardArtImage(card),
    };
  });
}

async function loadStoragePreview(
  request: SharePreviewRequest,
): Promise<SharePreview | null> {
  const claims = request.token ? await verifyStorageShareLink(request.token) : null;
  if (!claims || claims.locationGuid !== request.subjectGuid) return null;
  const scope = storageShareLinkScope(claims);
  return db.transaction(async (tx) => {
    const summary = await loadListSummary(
      tx,
      scope,
      claims.locationName,
      claims.purpose === "trade",
    );
    const { card } = await loadLeadingCard(tx, scope);
    return {
      ...storageSharePreviewText(summary),
      pathWithQuery: request.pathWithQuery,
      isIndexable: false,
      image: cardArtImage(card),
    };
  });
}

async function loadCardPreview(
  request: SharePreviewRequest,
): Promise<SharePreview | null> {
  const claims = request.token ? await verifyCardShareLink(request.token) : null;
  if (!claims || claims.scanId !== request.subjectGuid) return null;
  const scope = cardShareLinkScope(claims);
  return db.transaction(async (tx) => {
    const { card, formattedPrice } = await loadLeadingCard(tx, scope);
    if (!card) return null;
    return {
      ...cardSharePreviewText({
        name: card.card.name,
        setName: card.card.setName || null,
        collectorNumber: card.card.collectorNumber || null,
        condition: card.condition,
        isFoil: card.isFoil,
        foilType: card.foilType,
        formattedPrice,
      }),
      pathWithQuery: request.pathWithQuery,
      isIndexable: false,
      image: cardArtImage(card),
    };
  });
}

async function loadShopCatalogPreview(
  request: SharePreviewRequest,
): Promise<SharePreview | null> {
  const isPublicCatalogLink = !request.token;
  const claims = request.token
    ? await verifyShopCatalogLink(request.token)
    : await verifyPublicShopCatalog(request.subjectGuid);
  if (!claims || claims.catalogGuid !== request.subjectGuid) return null;
  const scope = shopCatalogScope(claims);
  return db.transaction(async (tx) => {
    const summary = await loadListSummary(tx, scope, claims.name, false);
    const shopPhoto = await loadShopPhotoImage(tx, claims.orgId, claims.name);
    const image = shopPhoto ?? cardArtImage((await loadLeadingCard(tx, scope)).card);
    return {
      ...shopCatalogSharePreviewText(summary),
      pathWithQuery: request.pathWithQuery,
      isIndexable: isPublicCatalogLink,
      image,
    };
  });
}

async function loadSharePreviewUncached(
  request: SharePreviewRequest,
): Promise<SharePreview> {
  const preview =
    request.kind === "collection"
      ? await loadCollectionPreview(request)
      : request.kind === "storage"
        ? await loadStoragePreview(request)
        : request.kind === "card"
          ? await loadCardPreview(request)
          : await loadShopCatalogPreview(request);
  return preview ?? unavailableSharePreview(request.pathWithQuery);
}

export async function loadSharePreview(
  request: SharePreviewRequest,
): Promise<SharePreview> {
  const cacheKey = `${request.kind}|${request.subjectGuid}|${request.token ?? ""}`;
  const cached = sharePreviewCache.get(cacheKey);
  if (cached) return { ...cached, pathWithQuery: request.pathWithQuery };
  const preview = await loadSharePreviewUncached(request);
  sharePreviewCache.set(cacheKey, preview);
  return preview;
}
