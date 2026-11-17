import { collectionCardsKeys } from "@/features/collections/api/collection-cards";
import { markStorageLocationCardsDownloaded } from "@/features/storage/api/storage-locations";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export function useMarkStorageCardsDownloaded(locationGuid: string) {
  const queryClient = useQueryClient();

  return useCallback(
    (scanIds: string[]) => {
      if (scanIds.length === 0) return;
      markStorageLocationCardsDownloaded(locationGuid, scanIds)
        .catch((err) => console.error("Failed to mark cards downloaded:", err))
        .finally(
          () =>
            void queryClient.invalidateQueries({
              queryKey: collectionCardsKeys.root(),
            }),
        );
    },
    [locationGuid, queryClient],
  );
}
