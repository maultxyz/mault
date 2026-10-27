import {
  collectionCardsKeys,
  unmatchedCardsKeys,
} from "@/features/collections/api/collection-cards";
import type {
  CollectionCardsPage,
  GroupedScannedCard,
} from "@magic-vault/shared";
import { CARD_QUERY_KINDS_REFRESHED_SEPARATELY } from "@/lib/constants/collections";
import {
  CARDS_LIST_REFRESH_THROTTLE_MS,
  CARDS_SUMMARY_REFRESH_THROTTLE_MS,
} from "@/lib/constants/timing";
import type { QueryClient } from "@tanstack/react-query";

function createCollectionRefreshThrottle(throttleMs: number) {
  const pendingRefreshes = new Map<string, ReturnType<typeof setTimeout>>();
  const lastRefreshAt = new Map<string, number>();
  return (guid: string, refresh: () => void) => {
    if (pendingRefreshes.has(guid)) return;
    const elapsed = Date.now() - (lastRefreshAt.get(guid) ?? 0);
    pendingRefreshes.set(
      guid,
      setTimeout(
        () => {
          pendingRefreshes.delete(guid);
          lastRefreshAt.set(guid, Date.now());
          refresh();
        },
        Math.max(0, throttleMs - elapsed),
      ),
    );
  };
}

const throttleSummaryRefresh = createCollectionRefreshThrottle(
  CARDS_SUMMARY_REFRESH_THROTTLE_MS,
);
const throttleCardListRefresh = createCollectionRefreshThrottle(
  CARDS_LIST_REFRESH_THROTTLE_MS,
);

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

export function findInCardPages(
  queryClient: QueryClient,
  guid: string,
  scanId: string,
): GroupedScannedCard | undefined {
  for (const [, page] of queryClient.getQueriesData<CollectionCardsPage>({
    queryKey: [...collectionCardsKeys.all(guid), "page"],
  })) {
    const item = page?.items.find((i) => i.scanIds.includes(scanId));
    if (item) return item;
  }
  return undefined;
}

export function invalidateBinCounts(queryClient: QueryClient, guid: string) {
  return queryClient.invalidateQueries({
    queryKey: [...collectionCardsKeys.all(guid), "bin-counts"],
  });
}

export function invalidateUnmatchedCards(
  queryClient: QueryClient,
  guid: string,
) {
  return queryClient.invalidateQueries({
    queryKey: unmatchedCardsKeys.all(guid),
  });
}

export function invalidateCollectionCards(
  queryClient: QueryClient,
  guid: string,
) {
  void queryClient.invalidateQueries({
    queryKey: [...collectionCardsKeys.all(guid), "export"],
    refetchType: "none",
  });
  throttleSummaryRefresh(guid, () => {
    void queryClient.invalidateQueries({
      queryKey: [...collectionCardsKeys.all(guid), "summary"],
    });
  });
  throttleCardListRefresh(guid, () => {
    void queryClient.invalidateQueries({
      queryKey: collectionCardsKeys.all(guid),
      predicate: (query) =>
        !CARD_QUERY_KINDS_REFRESHED_SEPARATELY.includes(String(query.queryKey[2])),
    });
  });
}
