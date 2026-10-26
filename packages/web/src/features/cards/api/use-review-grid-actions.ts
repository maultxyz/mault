import { businessKeys } from "@/features/business/api/business";
import {
  confirmCollectionCard,
  markCollectionCardReviewed,
  updateCollectionCard,
} from "@/features/collections/api/collections";
import { invalidateCollectionCards } from "@/features/collections/lib/card-page-cache";
import { storageLocationKeys } from "@/features/storage/api/storage-locations";
import {
  reviewAcceptKind,
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
      const results = await Promise.allSettled(
        cards.map((card) =>
          reviewAcceptKind(card) === "confirm"
            ? confirmCollectionCard(card.collectionGuid, card.scanId)
            : markCollectionCardReviewed(card.collectionGuid, card.scanId),
        ),
      );
      refreshReviewedCards(cards.map((card) => card.collectionGuid));
      return cards.filter((_card, index) => {
        const result = results[index];
        return result.status === "rejected" || !result.value.success;
      });
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
