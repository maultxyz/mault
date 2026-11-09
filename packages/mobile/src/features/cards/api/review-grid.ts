import { queryOptions, type QueryClient } from "@tanstack/react-query";
import {
  EMPTY_CARD_FILTERS,
  groupReviewAcceptRequests,
  toReviewGridCard,
  type CollectionCardsPage,
  type Result,
  type ReviewAcceptRequest,
  type ReviewAcceptResult,
  type ReviewGridAttributeUpdate,
  type ReviewGridCard,
  type StorageLocationCardPage,
} from "@magic-vault/shared";
import { invalidateCollectionCards, updateCollectionCard } from "@/features/collections/api/collection-cards";
import { apiGet, apiPost, unwrap } from "@/lib/api/client";
import type { ReviewGridData } from "@/lib/interfaces/cards";

export const collectionReviewGridQueryOptions = (guid: string) =>
  queryOptions({
    queryKey: ["collection-cards", guid, "review-grid"] as const,
    queryFn: async (): Promise<ReviewGridData> => {
      const params = new URLSearchParams({
        grouped: "0",
        page: "0",
        unreviewed: "1",
        filters: JSON.stringify({ ...EMPTY_CARD_FILTERS, needsAttention: true }),
      });
      const page = await unwrap(apiGet<Result<CollectionCardsPage>>(`/api/collections/${guid}/cards?${params.toString()}`));
      return { cards: page.items.map((entry) => toReviewGridCard(guid, entry)), total: page.totalEntries };
    },
  });

export const storageReviewGridQueryOptions = (guid: string) =>
  queryOptions({
    queryKey: ["storage-locations", "cards", guid, "review-grid"] as const,
    queryFn: async (): Promise<ReviewGridData> => {
      const page = await unwrap(
        apiGet<Result<StorageLocationCardPage>>(`/api/storage-locations/${guid}/cards/page?page=1&unreviewedOnly=true`),
      );
      return { cards: page.cards, total: page.total };
    },
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
