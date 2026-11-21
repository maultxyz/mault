import { cardSetsQueryOptions } from "@/features/cards/api/card-sets";
import { cardSearchQueryOptions } from "@/features/cards/api/use-card-search";
import { cachedCollectionCardSearchLanguage } from "@/features/cards/api/use-collection-card-search-language";
import { scanImageQueryOptions } from "@/features/cards/api/use-scan-image";
import { collectionCardPositionQueryOptions } from "@/features/collections/api/collection-cards";
import { collectionCardDetailsQueryOptions } from "@/features/collections/api/card-details";
import { SCAN_IMAGE_URL_STALE_MS } from "@/lib/constants/scanner";
import type { ScanImageUrls } from "@/lib/interfaces/cards";
import {
  DETAIL_PREFETCH_COUNT,
  DETAIL_PREFETCH_STALE_MS,
} from "@/lib/constants/cards";
import type {
  DetailPrefetchLoader,
  DetailPrefetchStep,
} from "@/lib/interfaces/cards";
import {
  CATALOG_SEARCH_MIN_QUERY_LENGTH,
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
  if (name.trim().length < CATALOG_SEARCH_MIN_QUERY_LENGTH) return;
  const language = cachedCollectionCardSearchLanguage(
    queryClient,
    step.collectionGuid,
  );
  void queryClient.prefetchInfiniteQuery(
    cardSearchQueryOptions(name, step.collectionGuid, undefined, language),
  );
  void queryClient.prefetchQuery(
    cardSetsQueryOptions(step.collectionGuid, name, language),
  );
}

async function prefetchCardDetailImages(
  queryClient: QueryClient,
  collectionGuid: string,
  scanId: string,
): Promise<ScanImageUrls> {
  const imageState = queryClient.getQueryState<ScanImageUrls>(
    scanImageQueryOptions(collectionGuid, scanId).queryKey,
  );
  if (
    imageState?.data &&
    Date.now() - imageState.dataUpdatedAt < SCAN_IMAGE_URL_STALE_MS
  ) {
    return imageState.data;
  }
  const details = await queryClient.fetchQuery(
    collectionCardDetailsQueryOptions(collectionGuid, scanId),
  );
  return details.images;
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
        void prefetchCardDetailImages(queryClient, step.collectionGuid, scanId)
          .then((images) => {
            if (cancelled) return;
            preloadImage(images?.capturedImageUrl, reviewMode);
            preloadImage(images?.capturedBackImageUrl, reviewMode);
          })
          .catch(() => undefined);
      },
    });
    return () => {
      cancelled = true;
    };
  }, [firstScanId, enabled, loadStep, reviewMode, queryClient]);
}
