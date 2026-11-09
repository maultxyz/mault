import { apiGet, apiPost } from "@/lib/api/client";
import type {
  BinCardCount,
  BinContentCard,
  BinWindow,
  CollectionCardPosition,
  CollectionCardsCount,
  CollectionCardsPage,
  CollectionCardsQuery,
  CollectionCardsSummary,
  Result,
  ScanTimelineBuckets,
  ScanTimelineGrouping,
} from "@magic-vault/shared";
import {
  COLLECTION_CARDS_PAGE_SIZE,
  SCAN_TIMELINE_PAGE_SIZE,
  UNMATCHED_PAGE_SIZE,
} from "@magic-vault/shared";
import {
  infiniteQueryOptions,
  keepPreviousData,
  queryOptions,
} from "@tanstack/react-query";
import { loadUnmatchedCards } from "@/features/collections/api/collections";

export function cardsQueryParams(
  query: CollectionCardsQuery,
  extra: Record<string, string> = {},
): string {
  const params = new URLSearchParams(extra);
  if (query.search) params.set("search", query.search);
  if (query.sort) params.set("sort", query.sort);
  if (query.grouped) params.set("grouped", "1");
  if (query.unreviewed) params.set("unreviewed", "1");
  params.set("filters", JSON.stringify(query.filters));
  return params.toString();
}

async function unwrap<T>(request: Promise<Result<T>>): Promise<T> {
  const result = await request;
  if (!result.success || result.data === undefined) {
    throw new Error(result.message ?? "Failed to load cards.");
  }
  return result.data;
}

export const collectionCardsKeys = {
  root: () => ["collection-cards"] as const,
  all: (guid: string | undefined) =>
    [...collectionCardsKeys.root(), guid] as const,
  page: (guid: string | undefined, query: CollectionCardsQuery, page: number) =>
    [...collectionCardsKeys.all(guid), "page", query, page] as const,
  summary: (guid: string | undefined, query: CollectionCardsQuery) =>
    [...collectionCardsKeys.all(guid), "summary", query] as const,
  count: (guid: string | undefined, query: CollectionCardsQuery) =>
    [...collectionCardsKeys.all(guid), "count", query] as const,
  position: (
    guid: string | undefined,
    scanId: string | undefined,
    query: CollectionCardsQuery,
  ) => [...collectionCardsKeys.all(guid), "position", scanId, query] as const,
  binCounts: (guid: string | undefined, bins: BinWindow[]) =>
    [...collectionCardsKeys.all(guid), "bin-counts", bins] as const,
  scanTimelineCards: (guid: string | undefined, query: CollectionCardsQuery) =>
    [...collectionCardsKeys.all(guid), "scan-timeline-cards", query] as const,
  scanTimelineBuckets: (
    guid: string | undefined,
    query: CollectionCardsQuery,
    grouping: ScanTimelineGrouping,
    timeZone: string,
  ) =>
    [
      ...collectionCardsKeys.all(guid),
      "scan-timeline-buckets",
      query,
      grouping,
      timeZone,
    ] as const,
};

export const unmatchedCardsKeys = {
  all: (guid: string | undefined) => ["unmatched-cards", guid] as const,
  page: (guid: string | undefined, page: number) =>
    [...unmatchedCardsKeys.all(guid), "page", page] as const,
};

export const unmatchedCardsPageQueryOptions = (
  guid: string | undefined,
  page: number,
  pageSize: number = UNMATCHED_PAGE_SIZE,
) =>
  queryOptions({
    queryKey: [...unmatchedCardsKeys.page(guid, page), pageSize] as const,
    queryFn: () =>
      unwrap(
        loadUnmatchedCards(
          guid!,
          pageSize,
          (page - 1) * pageSize,
        ),
      ),
    enabled: !!guid,
    placeholderData: keepPreviousData,
  });

export function loadCollectionCardIds(
  guid: string,
  query: CollectionCardsQuery,
): Promise<string[]> {
  return unwrap(
    apiGet<Result<string[]>>(
      `/api/collections/${guid}/cards/ids?${cardsQueryParams(query)}`,
    ),
  );
}

export function loadStoredCardCount(
  guid: string,
  scanIds: string[],
): Promise<number> {
  return unwrap(
    apiPost<Result<{ storedCount: number }>>(
      `/api/collections/${guid}/cards/stored-count`,
      { scanIds },
    ),
  ).then((data) => data.storedCount);
}

export function loadBinContents(
  guid: string,
  bins: BinWindow[],
): Promise<BinContentCard[]> {
  const params = new URLSearchParams({ bins: JSON.stringify(bins) });
  return unwrap(
    apiGet<Result<BinContentCard[]>>(
      `/api/collections/${guid}/cards/bin-contents?${params}`,
    ),
  );
}

export const collectionCardsPageQueryOptions = (
  guid: string | undefined,
  query: CollectionCardsQuery,
  page: number,
  pageSize: number = COLLECTION_CARDS_PAGE_SIZE,
) =>
  queryOptions({
    queryKey: [...collectionCardsKeys.page(guid, query, page), pageSize] as const,
    queryFn: () =>
      unwrap(
        apiGet<Result<CollectionCardsPage>>(
          `/api/collections/${guid}/cards?${cardsQueryParams(query, { page: String(page), limit: String(pageSize) })}`,
        ),
      ),
    enabled: !!guid,
    placeholderData: keepPreviousData,
  });

export const scanTimelineCardsQueryOptions = (
  guid: string | undefined,
  query: CollectionCardsQuery,
) =>
  infiniteQueryOptions({
    queryKey: collectionCardsKeys.scanTimelineCards(guid, query),
    queryFn: ({ pageParam }) =>
      unwrap(
        apiGet<Result<CollectionCardsPage>>(
          `/api/collections/${guid}/cards?${cardsQueryParams(query, { page: String(pageParam), limit: String(SCAN_TIMELINE_PAGE_SIZE) })}`,
        ),
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      (lastPage.page + 1) * lastPage.pageSize < lastPage.totalEntries
        ? lastPage.page + 1
        : undefined,
    enabled: !!guid,
  });

export const scanTimelineBucketsQueryOptions = (
  guid: string | undefined,
  query: CollectionCardsQuery,
  grouping: ScanTimelineGrouping,
  timeZone: string,
) =>
  queryOptions({
    queryKey: collectionCardsKeys.scanTimelineBuckets(
      guid,
      query,
      grouping,
      timeZone,
    ),
    queryFn: () =>
      unwrap(
        apiGet<Result<ScanTimelineBuckets>>(
          `/api/collections/${guid}/cards/scan-timeline?${cardsQueryParams(query, { grouping, timeZone })}`,
        ),
      ),
    enabled: !!guid,
    placeholderData: keepPreviousData,
  });

export const collectionCardsSummaryQueryOptions = (
  guid: string | undefined,
  query: CollectionCardsQuery,
) =>
  queryOptions({
    queryKey: collectionCardsKeys.summary(guid, query),
    queryFn: () =>
      unwrap(
        apiGet<Result<CollectionCardsSummary>>(
          `/api/collections/${guid}/cards/summary?${cardsQueryParams(query)}`,
        ),
      ),
    enabled: !!guid,
    placeholderData: keepPreviousData,
  });

export const collectionCardsCountQueryOptions = (
  guid: string | undefined,
  query: CollectionCardsQuery,
) => {
  const countQuery: CollectionCardsQuery = {
    ...query,
    sort: null,
    grouped: false,
  };
  return queryOptions({
    queryKey: collectionCardsKeys.count(guid, countQuery),
    queryFn: () =>
      unwrap(
        apiGet<Result<CollectionCardsCount>>(
          `/api/collections/${guid}/cards/count?${cardsQueryParams(countQuery)}`,
        ),
      ),
    enabled: !!guid,
    placeholderData: keepPreviousData,
  });
};

export const collectionCardPositionQueryOptions = (
  guid: string | undefined,
  scanId: string | undefined,
  query: CollectionCardsQuery,
) =>
  queryOptions({
    queryKey: collectionCardsKeys.position(guid, scanId, query),
    queryFn: () =>
      unwrap(
        apiGet<Result<CollectionCardPosition | null>>(
          `/api/collections/${guid}/cards/${scanId}/position?${cardsQueryParams(query)}`,
        ),
      ),
    enabled: !!guid && !!scanId,
  });

export const binCardCountsQueryOptions = (
  guid: string | undefined,
  bins: BinWindow[],
) =>
  queryOptions({
    queryKey: collectionCardsKeys.binCounts(guid, bins),
    queryFn: () => {
      const params = new URLSearchParams({ bins: JSON.stringify(bins) });
      return unwrap(
        apiGet<Result<BinCardCount[]>>(
          `/api/collections/${guid}/cards/bin-counts?${params}`,
        ),
      );
    },
    enabled: !!guid && bins.length > 0,
    placeholderData: keepPreviousData,
  });
