import { businessKeys } from "@/features/business/api/business";
import {
  acceptCollectionCardReviews,
  updateCollectionCard,
} from "@/features/collections/api/collections";
import { invalidateCollectionCards } from "@/features/collections/lib/card-page-cache";
import { storageLocationKeys } from "@/features/storage/api/storage-locations";
import {
  groupReviewAcceptRequests,
  type PlayingCard,
  type ReviewGridCard,
} from "@magic-vault/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export function useReviewGridActions() {
  const queryClient = useQueryClient();

  const refreshReviewedCards = useCallback(
    (collectionGuids: string[]) => {
      for (const guid of new Set(collectionGuids)) {
        void invalidateCollectionCards(queryClient, guid);
      }
      void queryClient.invalidateQueries({
        queryKey: storageLocationKeys.root(),
      });
      void queryClient.invalidateQueries({
        queryKey: businessKeys.intakeRoot(),
      });
    },
    [queryClient],
  );

  const acceptCards = useCallback(
    async (cards: ReviewGridCard[]): Promise<ReviewGridCard[]> => {
      const results = await Promise.all(
        groupReviewAcceptRequests(cards).map(
          ({ collectionGuid, ...request }) =>
            acceptCollectionCardReviews(collectionGuid, request).catch(
              () => null,
            ),
        ),
      );
      refreshReviewedCards(cards.map((card) => card.collectionGuid));
      const acceptedScanIds = new Set(
        results.flatMap((result) =>
          result?.success ? (result.data?.acceptedScanIds ?? []) : [],
        ),
      );
      return cards.filter((card) => !acceptedScanIds.has(card.scanId));
    },
    [refreshReviewedCards],
  );

  const correctCard = useCallback(
    async (card: ReviewGridCard, correctedCard: PlayingCard) => {
      const result = await updateCollectionCard(
        card.collectionGuid,
        card.scanId,
        { ...correctedCard, distance: 0, confidence: 1 },
      ).catch(() => null);
      refreshReviewedCards([card.collectionGuid]);
      return !!result?.success;
    },
    [refreshReviewedCards],
  );

  return { acceptCards, correctCard };
}
