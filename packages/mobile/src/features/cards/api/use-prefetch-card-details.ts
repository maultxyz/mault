import { type FetchQueryOptions, type QueryClient, type QueryKey, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useEffect } from "react";
import {
  CARD_SEARCH_ALL_LANGUAGES,
  REVIEW_DETAIL_PREFETCH_COUNT,
  REVIEW_DETAIL_PREFETCH_MAX_AGE_MS,
  walkDetailPrefetchChain,
  type CollectionCardPosition,
} from "@magic-vault/shared";
import { cardSearchQueryOptions } from "@/features/cards/api/card-search";
import { collectionCardQueryOptions, scanImageQueryOptions } from "@/features/collections/api/collection-cards";
import { CARD_SEARCH_MIN_LENGTH } from "@/lib/constants/cards";
import { storageLocationCardContextQueryOptions } from "@/features/storage/api/storage";
import type { CardDetailPrefetchStep, CardDetailPrefetchTarget } from "@/lib/interfaces/cards";
import { absoluteUrl } from "@/lib/url";

async function fetchRecentQueryData<TData, TKey extends QueryKey>(
  queryClient: QueryClient,
  options: FetchQueryOptions<TData, Error, TData, TKey>,
): Promise<TData> {
  const cachedState = queryClient.getQueryState<TData>(options.queryKey);
  if (cachedState?.data !== undefined && Date.now() - cachedState.dataUpdatedAt < REVIEW_DETAIL_PREFETCH_MAX_AGE_MS) {
    return cachedState.data;
  }
  return queryClient.fetchQuery({ ...options, staleTime: REVIEW_DETAIL_PREFETCH_MAX_AGE_MS });
}

function toStep(
  collectionGuid: string,
  position: CollectionCardPosition | null,
  nextScanId: string | null,
): CardDetailPrefetchStep | null {
  if (!position) return null;
  return { collectionGuid, position, nextScanId };
}

async function loadStep(
  queryClient: QueryClient,
  target: CardDetailPrefetchTarget,
  scanId: string,
): Promise<CardDetailPrefetchStep | null> {
  if (target.storageGuid) {
    const context = await fetchRecentQueryData(
      queryClient,
      storageLocationCardContextQueryOptions(target.storageGuid, scanId, true),
    );
    if (!context) return null;
    const collectionGuid = context.card.collectionGuid;
    const position = await fetchRecentQueryData(queryClient, collectionCardQueryOptions(collectionGuid, scanId, false));
    return toStep(collectionGuid, position, context.next?.scanId ?? null);
  }
  const position = await fetchRecentQueryData(
    queryClient,
    collectionCardQueryOptions(target.collectionGuid, scanId, target.reviewMode),
  );
  return toStep(target.collectionGuid, position, position?.nextScanId ?? null);
}

function prefetchCorrectionSearch(queryClient: QueryClient, step: CardDetailPrefetchStep) {
  const name = step.position.entry.card.name.trim();
  if (name.length < CARD_SEARCH_MIN_LENGTH) return;
  void queryClient.prefetchInfiniteQuery(cardSearchQueryOptions(name, step.collectionGuid, CARD_SEARCH_ALL_LANGUAGES));
}

function prefetchImages(urls: (string | null | undefined)[]) {
  const absoluteUrls = urls.map((url) => absoluteUrl(url)).filter((url): url is string => !!url);
  if (absoluteUrls.length > 0) void Image.prefetch(absoluteUrls).catch(() => false);
}

export function usePrefetchCardDetails(firstScanId: string | null | undefined, target: CardDetailPrefetchTarget) {
  const queryClient = useQueryClient();
  const { collectionGuid, reviewMode, storageGuid } = target;

  useEffect(() => {
    if (!firstScanId) return;
    let cancelled = false;
    const prefetchTarget = { collectionGuid, reviewMode, storageGuid };
    void walkDetailPrefetchChain({
      firstScanId,
      stepCount: REVIEW_DETAIL_PREFETCH_COUNT,
      loadStep: (scanId) => loadStep(queryClient, prefetchTarget, scanId),
      isCancelled: () => cancelled,
      onStepLoaded: (scanId, step) => {
        const { entry } = step.position;
        prefetchCorrectionSearch(queryClient, step);
        prefetchImages([
          entry.card.image?.normal,
          ...(entry.alternativeMatches ?? []).map((alternative) => alternative.image?.normal || alternative.image?.small),
        ]);
        void fetchRecentQueryData(queryClient, scanImageQueryOptions(step.collectionGuid, scanId))
          .then((images) => prefetchImages([images?.capturedImageUrl, images?.capturedBackImageUrl]))
          .catch(() => undefined);
      },
    });
    return () => {
      cancelled = true;
    };
  }, [firstScanId, collectionGuid, reviewMode, storageGuid, queryClient]);
}
