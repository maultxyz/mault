import { apiGet } from "@/lib/api/client";
import type {
  BinCardCount,
  BinContentCard,
  BinWindow,
  CollectionCardPosition,
  CollectionCardsPage,
  CollectionCardsQuery,
  CollectionCardsSummary,
  Result,
  ScannedCard,
} from "@magic-vault/shared";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

function queryParams(
  query: CollectionCardsQuery,
  extra: Record<string, string> = {},
): string {
  const params = new URLSearchParams(extra);
  if (query.search) params.set("search", query.search);
  if (query.sort) params.set("sort", query.sort);
  if (query.grouped) params.set("grouped", "1");
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
  all: (guid: string | undefined) => ["collection-cards", guid] as const,
  page: (guid: string | undefined, query: CollectionCardsQuery, page: number) =>
    [...collectionCardsKeys.all(guid), "page", query, page] as const,
  summary: (guid: string | undefined, query: CollectionCardsQuery) =>
    [...collectionCardsKeys.all(guid), "summary", query] as const,
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

export function loadCollectionCardIds(
  guid: string,
  query: CollectionCardsQuery,
): Promise<string[]> {
  return unwrap(
    apiGet<Result<string[]>>(
      `/api/collections/${guid}/cards/ids?${queryParams(query)}`,
    ),
  );
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
          `/api/collections/${guid}/cards?${queryParams(query, { page: String(page) })}`,
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
          `/api/collections/${guid}/cards/summary?${queryParams(query)}`,
        ),
      ),
    enabled: !!guid,
    placeholderData: keepPreviousData,
  });

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
          `/api/collections/${guid}/cards/${scanId}/position?${queryParams(query)}`,
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
