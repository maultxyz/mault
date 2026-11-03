import { cardSetsQueryOptions } from "@/features/cards/api/card-sets";
import { cardSearchQueryOptions } from "@/features/cards/api/use-card-search";
import { scanImageQueryOptions } from "@/features/cards/api/use-scan-image";
import { collectionCardPositionQueryOptions } from "@/features/collections/api/collection-cards";
import {
  DETAIL_PREFETCH_COUNT,
  DETAIL_PREFETCH_STALE_MS,
} from "@/lib/constants/cards";
import type {
  DetailPrefetchLoader,
  DetailPrefetchStep,
} from "@/lib/interfaces/cards";
import {
  CARD_SEARCH_ALL_LANGUAGES,
  QUERY_MIN_LENGTH,
  REVIEW_DETAIL_PREFETCH_COUNT,
  REVIEW_DETAIL_PREFETCH_MAX_AGE_MS,
  walkDetailPrefetchChain,
  type CollectionCardsQuery,
} from "@magic-vault/shared";
import {
  useQueryClient,
  type FetchQueryOptions,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useEffect } from "react";

const reviewImagesStillLoading = new Set<HTMLImageElement>();

function preloadImage(src: string | null | undefined, reviewMode: boolean) {
  if (!src) return;
  const image = new Image();
  image.decoding = "async";
  if (reviewMode) {
    const release = () => reviewImagesStillLoading.delete(image);
    image.onload = release;
    image.onerror = release;
    reviewImagesStillLoading.add(image);
  }
  image.src = src;
}

function preloadStepImages(step: DetailPrefetchStep, reviewMode: boolean) {
  preloadImage(step.card.image?.normal, reviewMode);
  for (const alternative of step.alternativeMatches ?? []) {
    preloadImage(
      reviewMode
        ? alternative.image?.normal || alternative.image?.small
        : alternative.image?.small || alternative.image?.normal,
      reviewMode,
    );
  }
}

function prefetchReviewCorrectionSearch(
  queryClient: QueryClient,
  step: DetailPrefetchStep,
) {
  const name = step.card.name;
  if (name.trim().length < QUERY_MIN_LENGTH) return;
  void queryClient.prefetchInfiniteQuery(
    cardSearchQueryOptions(
      name,
      step.collectionGuid,
      undefined,
      CARD_SEARCH_ALL_LANGUAGES,
    ),
  );
  void queryClient.prefetchQuery(
    cardSetsQueryOptions(step.collectionGuid, name, CARD_SEARCH_ALL_LANGUAGES),
  );
}

export async function fetchPrefetchQueryData<TData, TKey extends QueryKey>(
  queryClient: QueryClient,
  options: FetchQueryOptions<TData, Error, TData, TKey>,
  reviewMode: boolean,
): Promise<TData> {
  if (!reviewMode) {
    return queryClient.fetchQuery({
      ...options,
      staleTime: DETAIL_PREFETCH_STALE_MS,
    });
  }
  const cachedState = queryClient.getQueryState<TData>(options.queryKey);
  if (
    cachedState?.data !== undefined &&
    Date.now() - cachedState.dataUpdatedAt < REVIEW_DETAIL_PREFETCH_MAX_AGE_MS
  ) {
    return cachedState.data;
  }
  return queryClient.fetchQuery({
    ...options,
    staleTime: REVIEW_DETAIL_PREFETCH_MAX_AGE_MS,
  });
}

export async function loadCollectionPositionStep(
  queryClient: QueryClient,
  collectionGuid: string,
  scanId: string,
  query: CollectionCardsQuery,
  reviewMode: boolean,
): Promise<DetailPrefetchStep | null> {
  const position = await fetchPrefetchQueryData(
    queryClient,
    collectionCardPositionQueryOptions(collectionGuid, scanId, query),
    reviewMode,
  );
  if (!position) return null;
  return {
    collectionGuid,
    card: position.entry.card,
    alternativeMatches: position.entry.alternativeMatches,
    nextScanId: position.nextScanId,
  };
}

export function usePrefetchDetailCards(
  firstScanId: string | null | undefined,
  enabled: boolean,
  loadStep: DetailPrefetchLoader,
  reviewMode: boolean,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !firstScanId) return;
    let cancelled = false;
    void walkDetailPrefetchChain({
      firstScanId,
      stepCount: reviewMode
        ? REVIEW_DETAIL_PREFETCH_COUNT
        : DETAIL_PREFETCH_COUNT,
      loadStep,
      isCancelled: () => cancelled,
      onStepLoaded: (scanId, step) => {
        preloadStepImages(step, reviewMode);
        if (reviewMode) prefetchReviewCorrectionSearch(queryClient, step);
        const scanImage = scanImageQueryOptions(step.collectionGuid, scanId);
        void (
          reviewMode
            ? fetchPrefetchQueryData(queryClient, scanImage, true)
            : queryClient.fetchQuery(scanImage)
        )
          .then((url) => {
            if (!cancelled) preloadImage(url, reviewMode);
          })
          .catch(() => undefined);
      },
    });
    return () => {
      cancelled = true;
    };
  }, [firstScanId, enabled, loadStep, reviewMode, queryClient]);
}
