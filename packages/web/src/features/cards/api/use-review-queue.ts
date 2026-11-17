import { reviewQueueStore } from "@/features/cards/lib/review-queue-store";
import { collectionCardsPageQueryOptions } from "@/features/collections/api/collection-cards";
import { REVIEW_QUEUE_MAX_PAGES } from "@/lib/constants/cards";
import type {
  ReviewQueueCards,
  ReviewQueueSession,
} from "@/lib/interfaces/cards";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import type { QueryClient } from "@tanstack/react-query";

export function useReviewQueueSession() {
  return useSyncExternalStore(
    reviewQueueStore.subscribe,
    reviewQueueStore.getSnapshot,
    () => null,
  );
}

async function loadReviewQueueCards(
  queryClient: QueryClient,
  session: ReviewQueueSession,
): Promise<ReviewQueueCards> {
  const pageOptions = (page: number) => ({
    ...collectionCardsPageQueryOptions(
      session.collectionGuid,
      session.query,
      page,
    ),
    staleTime: 0,
  });
  const firstPage = await queryClient.fetchQuery(pageOptions(0));
  const pageCount = Math.min(
    REVIEW_QUEUE_MAX_PAGES,
    Math.ceil(firstPage.totalEntries / firstPage.pageSize),
  );
  const laterPages = await Promise.all(
    Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
      queryClient.fetchQuery(pageOptions(index + 1)),
    ),
  );
  const seenScanIds = new Set<string>();
  const cards = [firstPage, ...laterPages]
    .flatMap((page) => page.items)
    .filter((entry) => {
      if (seenScanIds.has(entry.scanId)) return false;
      seenScanIds.add(entry.scanId);
      return true;
    });
  return { cards, totalCards: firstPage.totalCards };
}

export function useReviewQueueCards(session: ReviewQueueSession) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["review-queue", session.collectionGuid, session.id],
    queryFn: () => loadReviewQueueCards(queryClient, session),
    staleTime: Infinity,
    gcTime: 0,
  });
}
