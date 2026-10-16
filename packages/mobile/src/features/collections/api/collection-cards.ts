import { infiniteQueryOptions, keepPreviousData, queryOptions } from "@tanstack/react-query";
import {
  EMPTY_CARD_FILTERS,
  type CollectionCardPosition,
  type CollectionCardsPage,
  type CollectionCardsSummary,
  type Result,
} from "@magic-vault/shared";
import { apiDelete, apiGet, unwrap } from "@/lib/api/client";
import { SCAN_IMAGE_STALE_MS } from "@/lib/constants/query";
import type { ScanImageResponse } from "@/lib/interfaces/collections";

function cardsParams(search: string, page?: number): string {
  const params = new URLSearchParams({
    grouped: "1",
    filters: JSON.stringify(EMPTY_CARD_FILTERS),
  });
  if (page != null) params.set("page", String(page));
  if (search) params.set("search", search);
  return params.toString();
}

export const collectionCardsQueryOptions = (guid: string, search: string) =>
  infiniteQueryOptions({
    queryKey: ["collection-cards", guid, search] as const,
    queryFn: ({ pageParam }) =>
      unwrap(
        apiGet<Result<CollectionCardsPage>>(`/api/collections/${guid}/cards?${cardsParams(search, pageParam)}`),
      ),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.totalEntries ? last.page + 1 : undefined,
  });

export const collectionCardsSummaryQueryOptions = (guid: string) =>
  queryOptions({
    queryKey: ["collection-cards", guid, "summary"] as const,
    queryFn: () =>
      unwrap(apiGet<Result<CollectionCardsSummary>>(`/api/collections/${guid}/cards/summary?${cardsParams("")}`)),
    placeholderData: keepPreviousData,
  });

export const collectionCardQueryOptions = (guid: string, scanId: string) =>
  queryOptions({
    queryKey: ["collection-card", guid, scanId] as const,
    queryFn: () =>
      unwrap(
        apiGet<Result<CollectionCardPosition | null>>(
          `/api/collections/${guid}/cards/${scanId}/position?${cardsParams("")}`,
        ),
      ),
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
