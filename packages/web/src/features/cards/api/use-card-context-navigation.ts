import {
  fetchPrefetchQueryData,
  loadCollectionPositionStep,
  usePrefetchDetailCards,
} from "@/features/cards/api/use-prefetch-detail-cards";
import { collectionCardPositionQueryOptions } from "@/features/collections/api/collection-cards";
import { useReviewSession } from "@/hooks/use-review-session";
import { ALL_CARDS_QUERY } from "@/lib/constants/card-filters";
import type {
  CardContextQueryOptions,
  NavigableCardContext,
} from "@/lib/interfaces/cards";
import {
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

export function useCardContextNavigation<
  TContext extends NavigableCardContext,
  TKey extends QueryKey,
>(
  contextQueryOptionsFor: (
    scanId: string,
  ) => CardContextQueryOptions<TContext, TKey>,
  scanId: string,
  reviewMode: boolean,
  onClose: () => void,
) {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery<
    TContext | null,
    Error,
    TContext | null,
    TKey
  >(contextQueryOptionsFor(scanId));
  const context: TContext | null = data ?? null;

  const stored: TContext["card"] | null = context?.card ?? null;
  const previous = context?.previous;
  const next = context?.next;
  const total = context?.total ?? 0;
  const reviewSession = useReviewSession(scanId, reviewMode);
  const prevScanId = reviewMode
    ? reviewSession.previousScanId
    : (previous?.scanId ?? null);
  const nextScanId = reviewMode
    ? reviewSession.resolveNext(next?.scanId)
    : (next?.scanId ?? null);

  const { data: position, isPending: isPositionPending } = useQuery(
    collectionCardPositionQueryOptions(
      stored?.collectionGuid,
      scanId,
      ALL_CARDS_QUERY,
    ),
  );
  const scanned = position?.entry.scanId === scanId ? position.entry : null;
  const isMissing =
    (!isPending && !stored) || (!!stored && !isPositionPending && !scanned);

  useEffect(() => {
    if (isMissing) onClose();
  }, [isMissing, onClose]);

  useEffect(() => {
    for (const neighbor of [next, previous]) {
      if (!neighbor) continue;
      void queryClient.prefetchQuery(contextQueryOptionsFor(neighbor.scanId));
      void queryClient.prefetchQuery(
        collectionCardPositionQueryOptions(
          neighbor.collectionGuid,
          neighbor.scanId,
          ALL_CARDS_QUERY,
        ),
      );
    }
  }, [next, previous, contextQueryOptionsFor, queryClient]);

  const loadPrefetchStep = useCallback(
    async (upcomingScanId: string) => {
      const nextContext = await fetchPrefetchQueryData(
        queryClient,
        contextQueryOptionsFor(upcomingScanId),
        reviewMode,
      );
      if (!nextContext) return null;
      const step = await loadCollectionPositionStep(
        queryClient,
        nextContext.card.collectionGuid,
        upcomingScanId,
        ALL_CARDS_QUERY,
        reviewMode,
      );
      return step && { ...step, nextScanId: nextContext.next?.scanId ?? null };
    },
    [queryClient, contextQueryOptionsFor, reviewMode],
  );
  usePrefetchDetailCards(nextScanId, true, loadPrefetchStep, reviewMode);

  return {
    context,
    stored,
    scanned,
    total,
    prevScanId,
    nextScanId,
    reviewSession,
  };
}
