import { queryOptions, type QueryClient } from "@tanstack/react-query";
import {
  EMPTY_CARD_FILTERS,
  reviewAcceptKind,
  toReviewGridCard,
  type CollectionCardsPage,
  type Result,
  type ReviewGridCard,
  type StorageLocationCardPage,
} from "@magic-vault/shared";
import { invalidateCollectionCards, updateCollectionCard } from "@/features/collections/api/collection-cards";
import { apiGet, unwrap } from "@/lib/api/client";
import type { ReviewGridData } from "@/lib/interfaces/cards";

export const collectionReviewGridQueryOptions = (guid: string) =>
  queryOptions({
    queryKey: ["collection-cards", guid, "review-grid"] as const,
    queryFn: async (): Promise<ReviewGridData> => {
      const params = new URLSearchParams({
        grouped: "0",
        page: "0",
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

export async function acceptReviewCards(queryClient: QueryClient, cards: ReviewGridCard[]): Promise<ReviewGridCard[]> {
  const results = await Promise.allSettled(
    cards.map((card) =>
      updateCollectionCard(
        card.collectionGuid,
        card.scanId,
        reviewAcceptKind(card) === "confirm" ? { confirmed: true } : { reviewed: true },
      ),
    ),
  );
  for (const guid of new Set(cards.map((card) => card.collectionGuid))) invalidateCollectionCards(queryClient, guid);
  return cards.filter((_card, index) => results[index].status === "rejected");
}
