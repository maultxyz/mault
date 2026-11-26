import { queryOptions, type QueryClient } from "@tanstack/react-query";
import {
  COLLECTION_CARDS_RAW_CARD_DATA_NONE,
  COLLECTION_CARDS_RAW_CARD_DATA_PARAM,
  EMPTY_CARD_FILTERS,
  groupReviewAcceptRequests,
  toReviewGridCard,
  type CollectionCardsPage,
  type Result,
  type ReviewAcceptRequest,
  type ReviewAcceptResult,
  type ReviewAutoCheckResult,
  type ReviewGridAttributeUpdate,
  type ReviewGridCard,
  type StorageLocationCardPage,
} from "@magic-vault/shared";
import { invalidateCollectionCards, updateCollectionCard } from "@/features/collections/api/collection-cards";
import { apiGet, apiPost, unwrap } from "@/lib/api/client";
import type { ReviewGridData } from "@/lib/interfaces/cards";

async function fetchCollectionReviewGridPage(guid: string, page: number): Promise<ReviewGridData> {
  const params = new URLSearchParams({
    grouped: "0",
    page: String(page),
    unreviewed: "1",
    filters: JSON.stringify({ ...EMPTY_CARD_FILTERS, needsAttention: true }),
    [COLLECTION_CARDS_RAW_CARD_DATA_PARAM]: COLLECTION_CARDS_RAW_CARD_DATA_NONE,
  });
  const result = await unwrap(apiGet<Result<CollectionCardsPage>>(`/api/collections/${guid}/cards?${params.toString()}`));
  return { cards: result.items.map((entry) => toReviewGridCard(guid, entry)), total: result.totalEntries };
}

async function fetchStorageReviewGridPage(guid: string, page: number): Promise<ReviewGridData> {
  const requestedPage = page + 1;
  const result = await unwrap(
    apiGet<Result<StorageLocationCardPage>>(`/api/storage-locations/${guid}/cards/page?page=${requestedPage}&unreviewedOnly=true`),
  );
  return { cards: result.page === requestedPage ? result.cards : [], total: result.total };
}

export const loadCollectionReviewCardPage = (guid: string, page: number) =>
  fetchCollectionReviewGridPage(guid, page).then((result) => result.cards);

export const loadStorageReviewCardPage = (guid: string, page: number) =>
  fetchStorageReviewGridPage(guid, page).then((result) => result.cards);

export const collectionReviewGridQueryOptions = (guid: string) =>
  queryOptions({
    queryKey: ["collection-cards", guid, "review-grid"] as const,
    queryFn: () => fetchCollectionReviewGridPage(guid, 0),
  });

export const storageReviewGridQueryOptions = (guid: string) =>
  queryOptions({
    queryKey: ["storage-locations", "cards", guid, "review-grid"] as const,
    queryFn: () => fetchStorageReviewGridPage(guid, 0),
  });

function acceptCollectionCardReviews(guid: string, request: ReviewAcceptRequest): Promise<ReviewAcceptResult> {
  return unwrap(apiPost<Result<ReviewAcceptResult>>(`/api/collections/${guid}/cards/accept-review`, request));
}

export async function acceptReviewCards(
  queryClient: QueryClient,
  cards: ReviewGridCard[],
  attributeUpdates: ReadonlyMap<string, ReviewGridAttributeUpdate> = new Map(),
): Promise<ReviewGridCard[]> {
  const updateFailedScanIds = new Set<string>();
  await Promise.all(
    cards.map(async (card) => {
      const update = attributeUpdates.get(card.scanId);
      if (!update) return;
      await updateCollectionCard(card.collectionGuid, card.scanId, update).catch(() => {
        updateFailedScanIds.add(card.scanId);
      });
    }),
  );
  const updatedCards = cards.filter((card) => !updateFailedScanIds.has(card.scanId));
  const results = await Promise.all(
    groupReviewAcceptRequests(updatedCards).map(({ collectionGuid, ...request }) =>
      acceptCollectionCardReviews(collectionGuid, request).catch(() => null),
    ),
  );
  for (const guid of new Set(cards.map((card) => card.collectionGuid))) invalidateCollectionCards(queryClient, guid);
  const acceptedScanIds = new Set(results.flatMap((result) => result?.acceptedScanIds ?? []));
  return cards.filter((card) => !acceptedScanIds.has(card.scanId));
}
