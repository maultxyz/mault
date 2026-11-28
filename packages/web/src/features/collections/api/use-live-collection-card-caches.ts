import { collectionCardsKeys } from "@/features/collections/api/collection-cards";
import {
  addScannedCardsToCardCaches,
  invalidateCollectionCards,
  invalidateUnmatchedCards,
  refreshCollectionCardsAfterScanSave,
} from "@/features/collections/lib/card-page-cache";
import type { SessionMonitorState } from "@/lib/interfaces/scanner";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export function useLiveCollectionCardCaches(
  collectionGuid: string | undefined,
  session: SessionMonitorState,
) {
  const queryClient = useQueryClient();
  const { cardsVersion, scannedCardsVersion, unmatchedVersion, recentCards } =
    session;

  useEffect(() => {
    if (!collectionGuid || cardsVersion === 0) return;
    invalidateCollectionCards(queryClient, collectionGuid);
  }, [cardsVersion, collectionGuid, queryClient]);

  useEffect(() => {
    if (!collectionGuid || scannedCardsVersion === 0) return;
    addScannedCardsToCardCaches(
      queryClient,
      collectionCardsKeys.all(collectionGuid),
      [...recentCards].reverse(),
    );
    refreshCollectionCardsAfterScanSave(queryClient, collectionGuid);
  }, [scannedCardsVersion, recentCards, collectionGuid, queryClient]);

  useEffect(() => {
    if (!collectionGuid || unmatchedVersion === 0) return;
    void invalidateUnmatchedCards(queryClient, collectionGuid);
  }, [unmatchedVersion, collectionGuid, queryClient]);
}
