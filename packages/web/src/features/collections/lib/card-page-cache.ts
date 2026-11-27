import {
  collectionCardsKeys,
  unmatchedCardsKeys,
} from "@/features/collections/api/collection-cards";
import {
  cardsPageWithScannedCard,
  cardsQueryListsNewestScansFirst,
  cardsSummaryWithScannedCards,
  COLLECTION_CARDS_INCLUDE_UNMATCHED_PARAM,
  SCAN_SAVE_CARD_LISTS_REFRESH_MS,
  type CollectionCardsPage,
  type CollectionCardsQuery,
  type CollectionCardsSummary,
  type GroupedScannedCard,
  type ScannedCard,
} from "@magic-vault/shared";
import {
  CARD_QUERY_KINDS_KEPT_BY_SCAN_SAVE_RECONCILE,
  CARD_QUERY_KINDS_REFRESHED_SEPARATELY,
} from "@/lib/constants/collections";
import {
  CARDS_LIST_REFRESH_THROTTLE_MS,
  CARDS_SUMMARY_REFRESH_THROTTLE_MS,
} from "@/lib/constants/timing";
import { createKeyedRefreshThrottle } from "@magic-vault/shared";
import type { InfiniteData, Query, QueryClient } from "@tanstack/react-query";

const throttleSummaryRefresh = createKeyedRefreshThrottle(
  CARDS_SUMMARY_REFRESH_THROTTLE_MS,
);
const throttleCardListRefresh = createKeyedRefreshThrottle(
  CARDS_LIST_REFRESH_THROTTLE_MS,
);
const throttleScanSaveReconcile = createKeyedRefreshThrottle(
  SCAN_SAVE_CARD_LISTS_REFRESH_MS,
);
const latestCardWriteAt = new Map<string, number>();
const fetchStartTrackedClients = new WeakSet<QueryClient>();
const queryFetchStartedAt = new WeakMap<Query, number>();

export function patchCardPages(
  queryClient: QueryClient,
  guid: string,
  patch: (items: GroupedScannedCard[]) => GroupedScannedCard[],
) {
  queryClient.setQueriesData<CollectionCardsPage>(
    { queryKey: [...collectionCardsKeys.all(guid), "page"] },
    (old) => (old ? { ...old, items: patch(old.items) } : old),
  );
  queryClient.setQueriesData<InfiniteData<CollectionCardsPage>>(
    { queryKey: [...collectionCardsKeys.all(guid), "scan-timeline-cards"] },
    (old) =>
      old
        ? {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: patch(page.items),
            })),
          }
        : old,
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
  for (const [, timeline] of queryClient.getQueriesData<
    InfiniteData<CollectionCardsPage>
  >({
    queryKey: [...collectionCardsKeys.all(guid), "scan-timeline-cards"],
  })) {
    for (const page of timeline?.pages ?? []) {
      const item = page.items.find((i) => i.scanIds.includes(scanId));
      if (item) return item;
    }
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
  void queryClient.invalidateQueries({
    queryKey: [...collectionCardsKeys.all(guid), "page"],
    predicate: (query) =>
      query.queryKey.includes(COLLECTION_CARDS_INCLUDE_UNMATCHED_PARAM),
  });
  return queryClient.invalidateQueries({
    queryKey: unmatchedCardsKeys.all(guid),
  });
}

export function addScannedCardsToCardCaches(
  queryClient: QueryClient,
  cardsKey: readonly unknown[],
  cardsOldestFirst: ScannedCard[],
) {
  if (cardsOldestFirst.length === 0) return;
  const queryCache = queryClient.getQueryCache();
  let addedCardCount = 0;
  for (const query of queryCache.findAll({ queryKey: [...cardsKey, "page"] })) {
    const cardsQuery = query.queryKey[cardsKey.length + 1] as CollectionCardsQuery;
    if (query.queryKey[cardsKey.length + 2] !== 0) continue;
    if (!cardsQueryListsNewestScansFirst(cardsQuery)) continue;
    queryClient.setQueryData<CollectionCardsPage>(query.queryKey, (old) => {
      if (!old) return old;
      const patched = cardsOldestFirst.reduce(cardsPageWithScannedCard, old);
      addedCardCount = Math.max(
        addedCardCount,
        patched.totalCards - old.totalCards,
      );
      return patched;
    });
  }
  if (addedCardCount === 0) return;
  for (const query of queryCache.findAll({ queryKey: [...cardsKey, "summary"] })) {
    const cardsQuery = query.queryKey[cardsKey.length + 1] as CollectionCardsQuery;
    queryClient.setQueryData<CollectionCardsSummary>(query.queryKey, (old) =>
      old ? cardsSummaryWithScannedCards(old, cardsQuery, addedCardCount) : old,
    );
  }
}

export function addScannedCardToCollectionCardCaches(
  queryClient: QueryClient,
  guid: string,
  card: ScannedCard,
) {
  addScannedCardsToCardCaches(queryClient, collectionCardsKeys.all(guid), [card]);
}

export function refreshCollectionCardsAfterScanSave(
  queryClient: QueryClient,
  guid: string,
) {
  void queryClient.invalidateQueries({
    queryKey: [...collectionCardsKeys.all(guid), "export"],
    refetchType: "none",
  });
  throttleCardListRefresh(`${guid}:bin-counts`, () => {
    void invalidateBinCounts(queryClient, guid);
  });
  throttleScanSaveReconcile(guid, () => {
    void queryClient.invalidateQueries({
      queryKey: collectionCardsKeys.all(guid),
      predicate: (query) =>
        !CARD_QUERY_KINDS_KEPT_BY_SCAN_SAVE_RECONCILE.includes(
          String(query.queryKey[2]),
        ),
    });
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
  trackQueryFetchStarts(queryClient);
  latestCardWriteAt.set(guid, Date.now());
  throttleCardListRefresh(guid, () => {
    const writtenAt = latestCardWriteAt.get(guid) ?? 0;
    const isRefreshedHere = (query: Query) =>
      !CARD_QUERY_KINDS_REFRESHED_SEPARATELY.includes(String(query.queryKey[2]));
    void queryClient
      .invalidateQueries({
        queryKey: collectionCardsKeys.all(guid),
        predicate: isRefreshedHere,
        refetchType: "none",
      })
      .then(() =>
        queryClient.refetchQueries({
          queryKey: collectionCardsKeys.all(guid),
          type: "active",
          predicate: (query) =>
            isRefreshedHere(query) &&
            !isFetchStartedAfter(query, writtenAt),
        }),
      );
  });
}

function trackQueryFetchStarts(queryClient: QueryClient) {
  if (fetchStartTrackedClients.has(queryClient)) return;
  fetchStartTrackedClients.add(queryClient);
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type === "updated" && event.action.type === "fetch") {
      queryFetchStartedAt.set(event.query, Date.now());
    }
  });
}

function isFetchStartedAfter(query: Query, writtenAt: number): boolean {
  if (query.state.fetchStatus !== "fetching") return false;
  return (queryFetchStartedAt.get(query) ?? 0) > writtenAt;
}
