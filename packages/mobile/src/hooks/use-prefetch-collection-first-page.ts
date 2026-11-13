import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { EMPTY_CARD_FILTERS } from "@magic-vault/shared";
import { collectionCardsQueryOptions } from "@/features/collections/api/collection-cards";
import { buildCollectionCardsQuery, readStoredCollectionScanTimeline } from "@/features/collections/lib/card-query";
import { readCollectionViewMemory } from "@/hooks/use-collection-view-memory";
import { useActiveOrgId } from "@/hooks/use-org";

export function usePrefetchCollectionFirstPage(): (collectionGuid: string) => void {
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  return useCallback(
    (collectionGuid: string) => {
      const memory = readCollectionViewMemory(orgId, collectionGuid);
      const query = buildCollectionCardsQuery({
        search: "",
        sort: memory?.sort ?? null,
        filters: EMPTY_CARD_FILTERS,
        grouped: memory?.grouped ?? true,
        scanTimeline: readStoredCollectionScanTimeline(),
      });
      void queryClient.prefetchInfiniteQuery(collectionCardsQueryOptions(collectionGuid, query));
    },
    [queryClient, orgId],
  );
}
