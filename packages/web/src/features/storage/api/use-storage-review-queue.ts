import { fetchStorageUnreviewedCardsPage } from "@/features/storage/api/storage-locations";
import { REVIEW_QUEUE_MAX_PAGES } from "@/lib/constants/cards";
import type {
  StorageReviewQueue,
  StorageReviewQueueSession,
} from "@/lib/interfaces/storage";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

async function loadStorageReviewQueueCards(locationGuid: string) {
  const firstPage = await fetchStorageUnreviewedCardsPage(locationGuid, 1);
  const pageCount = Math.min(
    REVIEW_QUEUE_MAX_PAGES,
    Math.ceil(firstPage.total / firstPage.pageSize),
  );
  const laterPages = await Promise.all(
    Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
      fetchStorageUnreviewedCardsPage(locationGuid, index + 2),
    ),
  );
  const seenScanIds = new Set<string>();
  const cards = [firstPage, ...laterPages]
    .flatMap((page) => page.cards)
    .filter((entry) => {
      if (seenScanIds.has(entry.scanId)) return false;
      seenScanIds.add(entry.scanId);
      return true;
    });
  return { cards, totalCards: firstPage.total };
}

function withScanId(scanIds: ReadonlySet<string>, scanId: string) {
  return new Set([...scanIds, scanId]);
}

export function useStorageReviewQueue(
  locationGuid: string | undefined,
  isActive: boolean,
): StorageReviewQueue {
  const [nextSessionId, setNextSessionId] = useState(1);
  const [session, setSession] = useState<StorageReviewQueueSession | null>(
    null,
  );
  const wantsSession = isActive && !!locationGuid;
  if (wantsSession && session?.locationGuid !== locationGuid) {
    setSession({
      id: nextSessionId,
      locationGuid,
      reviewedScanIds: new Set(),
      removedScanIds: new Set(),
    });
    setNextSessionId(nextSessionId + 1);
  } else if (!wantsSession && session) {
    setSession(null);
  }

  const { data, isPending, isError } = useQuery({
    queryKey: ["storage-review-queue", session?.locationGuid, session?.id],
    queryFn: () => loadStorageReviewQueueCards(session!.locationGuid),
    enabled: !!session,
    staleTime: Infinity,
    gcTime: 0,
  });

  return {
    cards: data?.cards ?? [],
    totalCards: data?.totalCards ?? 0,
    isPending,
    isError,
    reviewedScanIds: session?.reviewedScanIds ?? new Set(),
    removedScanIds: session?.removedScanIds ?? new Set(),
    markReviewed: (scanId) =>
      setSession((current) =>
        current && !current.reviewedScanIds.has(scanId)
          ? {
              ...current,
              reviewedScanIds: withScanId(current.reviewedScanIds, scanId),
            }
          : current,
      ),
    markRemoved: (scanId) =>
      setSession((current) =>
        current && !current.removedScanIds.has(scanId)
          ? {
              ...current,
              removedScanIds: withScanId(current.removedScanIds, scanId),
            }
          : current,
      ),
  };
}
