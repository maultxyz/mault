import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import {
  withCardTags,
  type CardTag,
  type CollectionCardPosition,
  type CollectionCardsPage,
  type StorageLocationCardPage,
} from "@magic-vault/shared";
import type { CardCacheSnapshot } from "@/lib/interfaces/undo";

const STORAGE_CARDS_PAGE_QUERY_KEY = ["storage-locations", "cards-page"] as const;

function collectionListQueryKey(collectionGuid: string) {
  return ["collection-cards", collectionGuid, "list"] as const;
}

function collectionCardQueryKey(collectionGuid: string) {
  return ["collection-card", collectionGuid] as const;
}

export function snapshotCardCaches(queryClient: QueryClient, collectionGuid: string): CardCacheSnapshot {
  return [
    ...queryClient.getQueriesData({ queryKey: collectionListQueryKey(collectionGuid) }),
    ...queryClient.getQueriesData({ queryKey: collectionCardQueryKey(collectionGuid) }),
    ...queryClient.getQueriesData({ queryKey: STORAGE_CARDS_PAGE_QUERY_KEY }),
  ];
}

export function restoreCardCaches(queryClient: QueryClient, snapshot: CardCacheSnapshot): void {
  for (const [queryKey, data] of snapshot) queryClient.setQueryData(queryKey, data);
}

export function hideCardsInCaches(queryClient: QueryClient, collectionGuid: string, scanIds: string[]): void {
  const removedScanIds = new Set(scanIds);
  queryClient.setQueriesData<InfiniteData<CollectionCardsPage>>(
    { queryKey: collectionListQueryKey(collectionGuid) },
    (data) => {
      if (!data) return data;
      return {
        ...data,
        pages: data.pages.map((page) => {
          let droppedEntries = 0;
          let droppedCards = 0;
          const items = page.items.flatMap((item) => {
            const itemScanIds = item.scanIds.length > 0 ? item.scanIds : [item.scanId];
            const keptScanIds = itemScanIds.filter((itemScanId) => !removedScanIds.has(itemScanId));
            droppedCards += itemScanIds.length - keptScanIds.length;
            if (keptScanIds.length === itemScanIds.length) return [item];
            if (keptScanIds.length === 0) {
              droppedEntries += 1;
              return [];
            }
            return [
              {
                ...item,
                scanIds: keptScanIds,
                quantity: keptScanIds.length,
                scanId: keptScanIds.includes(item.scanId) ? item.scanId : keptScanIds[0],
              },
            ];
          });
          return {
            ...page,
            items,
            totalEntries: Math.max(0, page.totalEntries - droppedEntries),
            totalCards: Math.max(0, page.totalCards - droppedCards),
          };
        }),
      };
    },
  );
  queryClient.setQueriesData<InfiniteData<StorageLocationCardPage>>({ queryKey: STORAGE_CARDS_PAGE_QUERY_KEY }, (data) => {
    if (!data) return data;
    return {
      ...data,
      pages: data.pages.map((page) => {
        const cards = page.cards.filter((card) => !removedScanIds.has(card.scanId));
        return { ...page, cards, total: Math.max(0, page.total - (page.cards.length - cards.length)) };
      }),
    };
  });
}

export function setCardTagsInCaches(
  queryClient: QueryClient,
  collectionGuid: string,
  scanIds: string[],
  tags: CardTag[],
  enabled: boolean,
): void {
  const taggedScanIds = new Set(scanIds);
  queryClient.setQueriesData<InfiniteData<CollectionCardsPage>>(
    { queryKey: collectionListQueryKey(collectionGuid) },
    (data) =>
      data && {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.map((item) =>
            taggedScanIds.has(item.scanId) || item.scanIds.some((itemScanId) => taggedScanIds.has(itemScanId))
              ? withCardTags(item, tags, enabled)
              : item,
          ),
        })),
      },
  );
  queryClient.setQueriesData<CollectionCardPosition | null>({ queryKey: collectionCardQueryKey(collectionGuid) }, (data) =>
    data && taggedScanIds.has(data.entry.scanId) ? { ...data, entry: withCardTags(data.entry, tags, enabled) } : data,
  );
}
