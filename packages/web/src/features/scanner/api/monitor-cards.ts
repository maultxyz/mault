import {
  cardsQueryParams,
  collectionCardsKeys,
} from "@/features/collections/api/collection-cards";
import { apiGet } from "@/lib/api/client";
import { MONITOR_LINK_CARDS_QUERY_KEY } from "@/lib/constants/query";
import type { MonitorCardsSource } from "@/lib/interfaces/scanner";
import type {
  CollectionCardsPage,
  CollectionCardsQuery,
  CollectionCardsSummary,
  Result,
} from "@magic-vault/shared";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { API_BASE } from "@/lib/constants/api";

async function loadMonitorCards<T>(
  source: MonitorCardsSource,
  path: string,
  query: string,
): Promise<T> {
  const token = source.shareToken;
  const result = token
    ? ((await fetch(
        `${API_BASE}/api/public/monitor-link${path}?${query}&${new URLSearchParams({ token })}`,
      ).then((res) => res.json())) as Result<T>)
    : await apiGet<Result<T>>(
        `/api/collections/${source.collectionGuid}${path}?${query}`,
      );
  if (!result.success || result.data === undefined) {
    throw new Error(result.message ?? "Failed to load cards.");
  }
  return result.data;
}

export function monitorCardsKey(source: MonitorCardsSource) {
  return source.shareToken
    ? [MONITOR_LINK_CARDS_QUERY_KEY, source.collectionGuid]
    : [...collectionCardsKeys.all(source.collectionGuid)];
}

export function monitorCardsPageQueryOptions(
  source: MonitorCardsSource,
  query: CollectionCardsQuery,
  page: number,
) {
  return queryOptions({
    queryKey: [...monitorCardsKey(source), "page", query, page],
    queryFn: () =>
      loadMonitorCards<CollectionCardsPage>(
        source,
        "/cards",
        cardsQueryParams(query, { page: String(page) }),
      ),
    enabled: !!source.collectionGuid,
    placeholderData: keepPreviousData,
  });
}

export function monitorCardsSummaryQueryOptions(
  source: MonitorCardsSource,
  query: CollectionCardsQuery,
) {
  return queryOptions({
    queryKey: [...monitorCardsKey(source), "summary", query],
    queryFn: () =>
      loadMonitorCards<CollectionCardsSummary>(
        source,
        "/cards/summary",
        cardsQueryParams(query),
      ),
    enabled: !!source.collectionGuid,
    placeholderData: keepPreviousData,
  });
}
