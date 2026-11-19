import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  storageLocationCardsPageQueryOptions,
  storageLocationCardsSummaryQueryOptions,
  storageLocationQueryOptions,
} from "@/features/storage/api/storage";
import { STORAGE_LOCATION_DEFAULT_CARDS_QUERY } from "@/lib/constants/storage";

export function usePrefetchStorageLocation(): (storageLocationGuid: string) => void {
  const queryClient = useQueryClient();
  return useCallback(
    (storageLocationGuid: string) => {
      void queryClient.prefetchQuery(storageLocationQueryOptions(storageLocationGuid));
      void queryClient.prefetchQuery(storageLocationCardsSummaryQueryOptions(storageLocationGuid));
      void queryClient.prefetchInfiniteQuery(
        storageLocationCardsPageQueryOptions(storageLocationGuid, STORAGE_LOCATION_DEFAULT_CARDS_QUERY),
      );
    },
    [queryClient],
  );
}
