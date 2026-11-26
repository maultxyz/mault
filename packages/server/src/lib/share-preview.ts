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
import { OPEN_GRAPH_CARDS_SHOWN_MAX } from "./constants/open-graph-image";
import type {
  SharePreview,
  SharePreviewCardArt,
  SharePreviewListSummary,
  SharePreviewRequest,
} from "./interfaces/share-preview";
import { verifyMonitorLink } from "./monitor-links";
import { loadPublishedOrgProfile } from "./org-profiles";
import { orgHasFeature } from "./plan-config";
import { loadOrgPricing } from "./price-source";
import { loadPublicCardGames, loadPublicCardPage } from "./public-card-browse";
import {
  cardShareLinkScope,
  collectionShareLinkScope,
  orgProfileScope,
  shopCatalogScope,
  storageShareLinkScope,
} from "./share-link-scopes";
import {
  cardOpenGraphImage,
  cardSharePreviewText,
  listOpenGraphImage,
  collectionSharePreviewText,
  profileSharePreviewText,
  shopCatalogSharePreviewText,
  storageSharePreviewText,
  unavailableSharePreview,
} from "./share-preview-html";
import { loadShopPhotoRow } from "./shop-photo";
import { verifyPublicShopCatalog, verifyShopCatalogLink } from "./shop-catalogs";
import { verifyStorageShareLink } from "./storage-share-links";
import { createTtlCache } from "./ttl-cache";

const sharePreviewCache = createTtlCache<SharePreview>({
  name: "shareLinks.previews",
  hasSecretKeys: true,
  ttlMs: SHARE_PREVIEW_CACHE_TTL_MS,
  maxEntries: SHARE_PREVIEW_CACHE_MAX_ENTRIES,
});

async function loadLeadingCards(
  tx: Transaction,
  scope: PublicCardBrowseScope,
  count: number,
): Promise<{ cards: PublicCard[]; leadingCardPrice: string | null }> {
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
      pageSize: count,
      requestedPage: 1,
    },
    pricing,
  );
  const card = page.cards[0];
  if (!card || !scope.showsPrices) return { cards: page.cards, leadingCardPrice: null };
  const price = cardPriceFor(
    card.card,
    { isFoil: card.isFoil, foilType: card.foilType, stamp: card.stamp },
    pricing.source,
    card.condition,
    pricing.conditionMultipliers,
  );
  return {
    cards: page.cards,
    leadingCardPrice: price == null ? null : formatPrice(price, pricing.source),
  };
}

function cardArtOf(cards: PublicCard[]): SharePreviewCardArt[] {
  return cards.flatMap((card) => {
    const imageUrl = card.card.image?.normal;
    return imageUrl ? [{ name: card.card.name, imageUrl }] : [];
  });
}

async function shopPhotoOrgId(tx: Transaction, orgId: string): Promise<string | null> {
  if (!(await orgHasFeature(tx, orgId, "businessTools"))) return null;
  const row = await loadShopPhotoRow(tx, orgId);
  return row?.shopPhotoKey || row?.shopPhotoDataUrl ? orgId : null;
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
  if (!claims || claims.collectionGuid !== request.subjectKey) return null;
  const scope = collectionShareLinkScope(claims);
  return db.transaction(async (tx) => {
    const summary = await loadListSummary(
      tx,
      scope,
      claims.collectionName,
      claims.purpose === "trade",
    );
    const { cards } = await loadLeadingCards(tx, scope, OPEN_GRAPH_CARDS_SHOWN_MAX);
    return {
      ...collectionSharePreviewText(summary),
      pathWithQuery: request.pathWithQuery,
      isIndexable: false,
      openGraphImage: listOpenGraphImage("collection", summary, cardArtOf(cards), null),
      itemCount: summary.cardCount,
      topics: summary.games.map((game) => game.name),
    };
  });
}

async function loadStoragePreview(
  request: SharePreviewRequest,
): Promise<SharePreview | null> {
  const claims = request.token ? await verifyStorageShareLink(request.token) : null;
  if (!claims || claims.locationGuid !== request.subjectKey) return null;
  const scope = storageShareLinkScope(claims);
  return db.transaction(async (tx) => {
    const summary = await loadListSummary(
      tx,
      scope,
      claims.locationName,
      claims.purpose === "trade",
    );
    const { cards } = await loadLeadingCards(tx, scope, OPEN_GRAPH_CARDS_SHOWN_MAX);
    return {
      ...storageSharePreviewText(summary),
      pathWithQuery: request.pathWithQuery,
      isIndexable: false,
      openGraphImage: listOpenGraphImage("storage", summary, cardArtOf(cards), null),
      itemCount: summary.cardCount,
      topics: summary.games.map((game) => game.name),
    };
  });
}

async function loadCardPreview(
  request: SharePreviewRequest,
): Promise<SharePreview | null> {
  const claims = request.token ? await verifyCardShareLink(request.token) : null;
  if (!claims || claims.scanId !== request.subjectKey) return null;
  const scope = cardShareLinkScope(claims);
  return db.transaction(async (tx) => {
    const { cards, leadingCardPrice } = await loadLeadingCards(tx, scope, 1);
    const card = cards[0];
    if (!card) return null;
    const summary = {
      name: card.card.name,
      setName: card.card.setName || null,
      collectorNumber: card.card.collectorNumber || null,
      condition: card.condition,
      isFoil: card.isFoil,
      foilType: card.foilType,
      formattedPrice: leadingCardPrice,
    };
    return {
      ...cardSharePreviewText(summary),
      pathWithQuery: request.pathWithQuery,
      isIndexable: false,
      openGraphImage: cardOpenGraphImage(summary, cardArtOf(cards)[0] ?? null),
      itemCount: 1,
      topics: [],
    };
  });
}

async function loadShopCatalogPreview(
  request: SharePreviewRequest,
): Promise<SharePreview | null> {
  const isPublicCatalogLink = !request.token;
  const claims = request.token
    ? await verifyShopCatalogLink(request.token)
    : await verifyPublicShopCatalog(request.subjectKey);
  if (!claims || claims.catalogGuid !== request.subjectKey) return null;
  const scope = shopCatalogScope(claims);
  return db.transaction(async (tx) => {
    const summary = await loadListSummary(tx, scope, claims.name, false);
    const { cards } = await loadLeadingCards(tx, scope, OPEN_GRAPH_CARDS_SHOWN_MAX);
    return {
      ...shopCatalogSharePreviewText(summary),
      pathWithQuery: request.pathWithQuery,
      isIndexable: isPublicCatalogLink,
      openGraphImage: listOpenGraphImage(
        "shopCatalog",
        summary,
        cardArtOf(cards),
        await shopPhotoOrgId(tx, claims.orgId),
      ),
      itemCount: summary.cardCount,
      topics: summary.games.map((game) => game.name),
    };
  });
}

async function loadProfilePreview(
  request: SharePreviewRequest,
): Promise<SharePreview | null> {
  const profile = await loadPublishedOrgProfile(request.subjectKey);
  if (!profile) return null;
  const scope = orgProfileScope(profile);
  return db.transaction(async (tx) => {
    const summary = await loadListSummary(tx, scope, profile.displayName, false);
    const { cards } = await loadLeadingCards(tx, scope, OPEN_GRAPH_CARDS_SHOWN_MAX);
    return {
      ...profileSharePreviewText(summary, profile.bio),
      pathWithQuery: request.pathWithQuery,
      isIndexable: true,
      openGraphImage: listOpenGraphImage(
        "profile",
        summary,
        cardArtOf(cards),
        await shopPhotoOrgId(tx, profile.orgId),
      ),
      itemCount: summary.cardCount,
      topics: summary.games.map((game) => game.name),
    };
  });
}

const SHARE_PREVIEW_LOADERS: Record<
  SharePreviewRequest["kind"],
  (request: SharePreviewRequest) => Promise<SharePreview | null>
> = {
  collection: loadCollectionPreview,
  storage: loadStoragePreview,
  card: loadCardPreview,
  shopCatalog: loadShopCatalogPreview,
  profile: loadProfilePreview,
};

async function loadSharePreviewUncached(
  request: SharePreviewRequest,
): Promise<SharePreview> {
  const preview = await SHARE_PREVIEW_LOADERS[request.kind](request);
  return preview ?? unavailableSharePreview(request.pathWithQuery);
}

export function sharePreviewCacheKey(request: SharePreviewRequest): string {
  return `${request.kind}|${request.subjectKey}|${request.token ?? ""}`;
}

export async function loadSharePreview(
  request: SharePreviewRequest,
): Promise<SharePreview> {
  const cacheKey = sharePreviewCacheKey(request);
  const cached = sharePreviewCache.get(cacheKey);
  if (cached) return { ...cached, pathWithQuery: request.pathWithQuery };
  const preview = await loadSharePreviewUncached(request);
  sharePreviewCache.set(cacheKey, preview);
  return preview;
}
