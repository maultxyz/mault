import { collectionCardsKeys } from "@/features/collections/api/collection-cards";
import type {
  CollectionCardsPage,
  GroupedScannedCard,
} from "@magic-vault/shared";
import type { QueryClient } from "@tanstack/react-query";

// Optimistic edits to the loaded pages, so the grid reacts immediately while
// the follow-up refetch reconciles counts, sort order and page boundaries.
export function patchCardPages(
  queryClient: QueryClient,
  guid: string,
  patch: (items: GroupedScannedCard[]) => GroupedScannedCard[],
) {
  queryClient.setQueriesData<CollectionCardsPage>(
    { queryKey: [...collectionCardsKeys.all(guid), "page"] },
    (old) => (old ? { ...old, items: patch(old.items) } : old),
  );
}

export function removeFromCardPages(
  queryClient: QueryClient,
  guid: string,
  scanIds: Set<string>,
) {
  patchCardPages(queryClient, guid, (items) =>
    items.flatMap((item) => {
      const remaining = item.scanIds.filter((id) => !scanIds.has(id));
      if (remaining.length === 0) return [];
      return [{ ...item, scanIds: remaining, quantity: remaining.length }];
    }),
  );
}

export function updateInCardPages(
  queryClient: QueryClient,
  guid: string,
  scanIds: Set<string>,
  update: (item: GroupedScannedCard) => GroupedScannedCard,
) {
  patchCardPages(queryClient, guid, (items) =>
    items.map((item) => (scanIds.has(item.scanId) ? update(item) : item)),
  );
}

export function invalidateCollectionCards(
  queryClient: QueryClient,
  guid: string,
) {
  return queryClient.invalidateQueries({
    queryKey: collectionCardsKeys.all(guid),
  });
}
