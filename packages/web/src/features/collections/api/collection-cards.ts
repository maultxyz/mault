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
  ScannedCard,
} from "@magic-vault/shared";
import { UNMATCHED_PAGE_SIZE } from "@magic-vault/shared";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
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
  export: (guid: string | undefined) =>
    [...collectionCardsKeys.all(guid), "export"] as const,
  binCounts: (guid: string | undefined, bins: BinWindow[]) =>
    [...collectionCardsKeys.all(guid), "bin-counts", bins] as const,
};

export const unmatchedCardsKeys = {
  all: (guid: string | undefined) => ["unmatched-cards", guid] as const,
  page: (guid: string | undefined, page: number) =>
    [...unmatchedCardsKeys.all(guid), "page", page] as const,
};

export const unmatchedCardsPageQueryOptions = (
  guid: string | undefined,
  page: number,
) =>
  queryOptions({
    queryKey: unmatchedCardsKeys.page(guid, page),
    queryFn: () =>
      unwrap(
        loadUnmatchedCards(
          guid!,
          UNMATCHED_PAGE_SIZE,
          (page - 1) * UNMATCHED_PAGE_SIZE,
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

export function loadCardsForExport(
  guid: string,
  scanIds: string[],
): Promise<ScannedCard[]> {
  return unwrap(
    apiPost<Result<ScannedCard[]>>(`/api/collections/${guid}/cards/export`, {
      scanIds,
    }),
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
) =>
  queryOptions({
    queryKey: collectionCardsKeys.page(guid, query, page),
    queryFn: () =>
      unwrap(
        apiGet<Result<CollectionCardsPage>>(
          `/api/collections/${guid}/cards?${cardsQueryParams(query, { page: String(page) })}`,
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

export const collectionCardsExportQueryOptions = (
  guid: string | undefined,
  enabled: boolean,
) =>
  queryOptions({
    queryKey: collectionCardsKeys.export(guid),
    queryFn: () =>
      unwrap(
        apiGet<Result<ScannedCard[]>>(`/api/collections/${guid}/cards/export`),
      ),
    enabled: !!guid && enabled,
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
