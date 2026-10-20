import { collectionCardsKeys } from "@/features/collections/api/collection-cards";
import type {
  CollectionCardsPage,
  GroupedScannedCard,
} from "@magic-vault/shared";
import { CARDS_SUMMARY_REFRESH_THROTTLE_MS } from "@/lib/constants/timing";
import type { QueryClient } from "@tanstack/react-query";

const summaryRefreshTimers = new Map<string, ReturnType<typeof setTimeout>>();
const lastSummaryRefresh = new Map<string, number>();

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

function scheduleSummaryRefresh(queryClient: QueryClient, guid: string) {
  if (summaryRefreshTimers.has(guid)) return;
  const elapsed = Date.now() - (lastSummaryRefresh.get(guid) ?? 0);
  const wait = Math.max(0, CARDS_SUMMARY_REFRESH_THROTTLE_MS - elapsed);
  summaryRefreshTimers.set(
    guid,
    setTimeout(() => {
      summaryRefreshTimers.delete(guid);
      lastSummaryRefresh.set(guid, Date.now());
      void queryClient.invalidateQueries({
        queryKey: [...collectionCardsKeys.all(guid), "summary"],
      });
    }, wait),
  );
}

export function invalidateCollectionCards(
  queryClient: QueryClient,
  guid: string,
) {
  scheduleSummaryRefresh(queryClient, guid);
  return queryClient.invalidateQueries({
    queryKey: collectionCardsKeys.all(guid),
    predicate: (query) => query.queryKey[2] !== "summary",
  });
}
