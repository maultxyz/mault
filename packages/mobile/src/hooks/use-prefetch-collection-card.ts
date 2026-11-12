import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  cardScanOriginQueryOptions,
  collectionCardQueryOptions,
  scanImageQueryOptions,
} from "@/features/collections/api/collection-cards";
import { cardStorageLocationQueryOptions } from "@/features/storage/api/storage";

export function usePrefetchCollectionCard(): (collectionGuid: string, scanId: string) => void {
  const queryClient = useQueryClient();
  return useCallback(
    (collectionGuid: string, scanId: string) => {
      void queryClient.prefetchQuery(collectionCardQueryOptions(collectionGuid, scanId, false));
      void queryClient.prefetchQuery(scanImageQueryOptions(collectionGuid, scanId));
      void queryClient.prefetchQuery(cardScanOriginQueryOptions(collectionGuid, scanId));
      void queryClient.prefetchQuery(cardStorageLocationQueryOptions(collectionGuid, scanId));
    },
    [queryClient],
  );
}
