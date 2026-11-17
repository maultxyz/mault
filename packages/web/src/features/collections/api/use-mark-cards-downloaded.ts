import { markCollectionCardsDownloaded } from "@/features/collections/api/collections";
import { invalidateCollectionCards } from "@/features/collections/lib/card-page-cache";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export function useMarkCardsDownloaded(collectionGuid: string | undefined) {
  const queryClient = useQueryClient();

  return useCallback(
    (scanIds: string[]) => {
      if (scanIds.length === 0 || !collectionGuid) return;
      markCollectionCardsDownloaded(collectionGuid, scanIds)
        .catch((err) => console.error("Failed to mark cards downloaded:", err))
        .finally(
          () => void invalidateCollectionCards(queryClient, collectionGuid),
        );
    },
    [collectionGuid, queryClient],
  );
}
