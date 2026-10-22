import { scanImageQueryOptions } from "@/features/cards/api/use-scan-image";
import { collectionCardPositionQueryOptions } from "@/features/collections/api/collection-cards";
import {
  REVIEW_PREFETCH_COUNT,
  REVIEW_PREFETCH_STALE_MS,
} from "@/lib/constants/cards";
import type {
  ReviewPrefetchLoader,
  ReviewPrefetchStep,
} from "@/lib/interfaces/cards";
import type { CollectionCardsQuery } from "@magic-vault/shared";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

function preloadImage(src: string | null | undefined) {
  if (!src) return;
  const image = new Image();
  image.decoding = "async";
  image.src = src;
}

function preloadStepImages(step: ReviewPrefetchStep) {
  preloadImage(step.card.image?.normal);
  for (const alternative of step.alternativeMatches ?? []) {
    preloadImage(alternative.image?.small || alternative.image?.normal);
  }
}

export async function loadCollectionPositionStep(
  queryClient: QueryClient,
  collectionGuid: string,
  scanId: string,
  query: CollectionCardsQuery,
): Promise<ReviewPrefetchStep | null> {
  const position = await queryClient.fetchQuery({
    ...collectionCardPositionQueryOptions(collectionGuid, scanId, query),
    staleTime: REVIEW_PREFETCH_STALE_MS,
  });
  if (!position) return null;
  return {
    collectionGuid,
    card: position.entry.card,
    alternativeMatches: position.entry.alternativeMatches,
    nextScanId: position.nextScanId,
  };
}

export function usePrefetchReviewCards(
  firstScanId: string | null | undefined,
  enabled: boolean,
  loadStep: ReviewPrefetchLoader,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !firstScanId) return;
    let cancelled = false;
    void (async () => {
      let scanId: string | null = firstScanId;
      for (let i = 0; i < REVIEW_PREFETCH_COUNT && scanId; i++) {
        const step = await loadStep(scanId).catch(() => null);
        if (cancelled || !step) return;
        preloadStepImages(step);
        void queryClient
          .fetchQuery(scanImageQueryOptions(step.collectionGuid, scanId))
          .then((url) => {
            if (!cancelled) preloadImage(url);
          })
          .catch(() => undefined);
        scanId = step.nextScanId;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [firstScanId, enabled, loadStep, queryClient]);
}
