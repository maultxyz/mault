import { infiniteQueryOptions, keepPreviousData, queryOptions, type QueryClient } from "@tanstack/react-query";
import {
  EMPTY_CARD_FILTERS,
  type CardScanOrigin,
  type CollectionCardPosition,
  type CollectionCardsQuery,
  type MonitorLink,
  type CollectionCardsPage,
  type CollectionCardsSummary,
  type Result,
  type ScannedCard,
} from "@magic-vault/shared";
import { apiDelete, apiGet, apiPost, apiPut, unwrap, unwrapOr } from "@/lib/api/client";
import { SCAN_IMAGE_STALE_MS, SCAN_SAVE_REFRESH_THROTTLE_MS } from "@/lib/constants/query";
import type { CardUpdateBody } from "@/lib/interfaces/cards";
import type { ScanImageResponse } from "@/lib/interfaces/collections";

function cardsParams(search: string, page?: number, review = false): string {
  const params = new URLSearchParams({
    grouped: review ? "0" : "1",
    filters: JSON.stringify(review ? { ...EMPTY_CARD_FILTERS, needsAttention: true } : EMPTY_CARD_FILTERS),
  });
  if (page != null) params.set("page", String(page));
  if (search) params.set("search", search);
  return params.toString();
}

function queryParams(query: CollectionCardsQuery, page: number): string {
  const params = new URLSearchParams({ filters: JSON.stringify(query.filters), page: String(page) });
  if (query.grouped) params.set("grouped", "1");
  if (query.search) params.set("search", query.search);
  if (query.sort) params.set("sort", query.sort);
  return params.toString();
}

export const collectionCardsQueryOptions = (guid: string, query: CollectionCardsQuery) =>
  infiniteQueryOptions({
    queryKey: ["collection-cards", guid, "list", query] as const,
    queryFn: ({ pageParam }) =>
      unwrap(apiGet<Result<CollectionCardsPage>>(`/api/collections/${guid}/cards?${queryParams(query, pageParam)}`)),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      (last.page + 1) * last.pageSize < last.totalEntries ? last.page + 1 : undefined,
  });

export const collectionCardsSummaryQueryOptions = (guid: string) =>
  queryOptions({
    queryKey: ["collection-cards", guid, "summary"] as const,
    queryFn: () =>
      unwrap(apiGet<Result<CollectionCardsSummary>>(`/api/collections/${guid}/cards/summary?${cardsParams("")}`)),
    placeholderData: keepPreviousData,
  });

export const collectionCardQueryOptions = (guid: string, scanId: string, review = false) =>
  queryOptions({
    queryKey: ["collection-card", guid, scanId, review] as const,
    queryFn: () =>
      unwrap(
        apiGet<Result<CollectionCardPosition | null>>(
          `/api/collections/${guid}/cards/${scanId}/position?${cardsParams("", undefined, review)}`,
        ),
      ),
  });

export const reviewQueueQueryOptions = (guid: string) =>
  queryOptions({
    queryKey: ["collection-cards", guid, "review-queue"] as const,
    queryFn: () =>
      unwrap(
        apiGet<Result<CollectionCardsPage>>(`/api/collections/${guid}/cards?${cardsParams("", 0, true)}`),
      ).then((page) => ({ total: page.totalEntries, firstScanId: page.items[0]?.scanId ?? null })),
  });

export function updateCollectionCard(guid: string, scanId: string, body: CardUpdateBody): Promise<unknown> {
  return unwrap(apiPut<Result<unknown>>(`/api/collections/${guid}/cards/${scanId}`, body));
}

export function invalidateCollectionCards(queryClient: QueryClient, guid: string): void {
  void queryClient.invalidateQueries({ queryKey: ["collection-cards", guid] });
  void queryClient.invalidateQueries({ queryKey: ["collection-card", guid] });
  void queryClient.invalidateQueries({ queryKey: ["org-overview"] });
  void queryClient.invalidateQueries({ queryKey: ["stats"] });
  void queryClient.invalidateQueries({ queryKey: ["storage-locations"] });
}

const scanSaveRefreshTimers = new Map<string, ReturnType<typeof setTimeout>>();
const lastScanSaveRefresh = new Map<string, number>();

export function invalidateAfterScanSave(queryClient: QueryClient, guid: string): void {
  if (scanSaveRefreshTimers.has(guid)) return;
  const wait = Math.max(0, SCAN_SAVE_REFRESH_THROTTLE_MS - (Date.now() - (lastScanSaveRefresh.get(guid) ?? 0)));
  scanSaveRefreshTimers.set(
    guid,
    setTimeout(() => {
      scanSaveRefreshTimers.delete(guid);
      lastScanSaveRefresh.set(guid, Date.now());
      void queryClient.invalidateQueries({ queryKey: ["collection-cards", guid] });
    }, wait),
  );
}

export const cardScanOriginQueryOptions = (guid: string, scanId: string) =>
  queryOptions({
    queryKey: ["card-scan-origin", scanId] as const,
    queryFn: () =>
      unwrapOr(apiGet<Result<CardScanOrigin | null>>(`/api/collections/${guid}/cards/${scanId}/origin`), null),
    staleTime: Infinity,
  });

export const scanImageQueryOptions = (guid: string, scanId: string) =>
  queryOptions({
    queryKey: ["collection-card-image", guid, scanId] as const,
    queryFn: () =>
      unwrap(apiGet<Result<ScanImageResponse>>(`/api/collections/${guid}/cards/${scanId}/image`)).then(
        (data) => data.capturedImageUrl,
      ),
    staleTime: SCAN_IMAGE_STALE_MS,
  });

export function removeCollectionCard(guid: string, scanId: string): Promise<unknown> {
  return unwrap(apiDelete<Result<unknown>>(`/api/collections/${guid}/cards/${scanId}`));
}

export function removeCollectionCards(guid: string, scanIds: string[]): Promise<unknown> {
  return unwrap(apiPost<Result<unknown>>(`/api/collections/${guid}/cards/remove-bulk`, { scanIds }));
}

export function fetchCollectionCardCopies(guid: string, cardIds: string[]): Promise<ScannedCard[]> {
  const params = new URLSearchParams({ cardIds: cardIds.join(",") });
  return unwrap(apiGet<Result<ScannedCard[]>>(`/api/collections/${guid}/cards/copies?${params.toString()}`));
}

export function createMonitorLink(guid: string, expiresInDays: number): Promise<MonitorLink> {
  return unwrap(apiPost<Result<MonitorLink>>(`/api/collections/${guid}/monitor-link`, { expiresInDays }));
}

export function revokeMonitorLinks(guid: string): Promise<unknown> {
  return unwrap(apiPost<Result<unknown>>(`/api/collections/${guid}/monitor-link/revoke`));
}
