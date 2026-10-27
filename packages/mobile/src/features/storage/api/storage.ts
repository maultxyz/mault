import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type {
  CardStorageLocation,
  PagedList,
  Result,
  StorageLocation,
  StorageLocationCard,
  StorageLocationCardContext,
  StorageLocationCardPage,
  StorageLocationExportCard,
  StorageLocationSearchResult,
} from "@magic-vault/shared";
import { apiDelete, apiGet, apiPost, apiPut, unwrap, unwrapOr } from "@/lib/api/client";
import { STORAGE_LOCATIONS_PAGE_SIZE } from "@/lib/constants/storage";

function check(result: { success: boolean; message?: string }): void {
  if (!result.success) throw new Error(result.message ?? "Request failed.");
}

export const storageLocationsPageQueryOptions = (orgId: string | null) =>
  infiniteQueryOptions({
    queryKey: ["storage-locations", orgId, "page"] as const,
    queryFn: ({ pageParam }) =>
      unwrap(
        apiGet<Result<PagedList<StorageLocation>>>(
          `/api/storage-locations/page?page=${pageParam}&limit=${STORAGE_LOCATIONS_PAGE_SIZE}`,
        ),
      ),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    enabled: !!orgId,
  });

export const storageLocationQueryOptions = (guid: string) =>
  queryOptions({
    queryKey: ["storage-locations", "location", guid] as const,
    queryFn: () => unwrapOr(apiGet<Result<StorageLocation | null>>(`/api/storage-locations/${guid}`), null),
  });

export const storageLocationCardsPageQueryOptions = (guid: string) =>
  infiniteQueryOptions({
    queryKey: ["storage-locations", "cards-page", guid] as const,
    queryFn: ({ pageParam }) =>
      unwrap(apiGet<Result<StorageLocationCardPage>>(`/api/storage-locations/${guid}/cards/page?page=${pageParam}`)),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  });

export const storageLocationCardContextQueryOptions = (guid: string, scanId: string, enabled: boolean) =>
  queryOptions({
    queryKey: ["storage-locations", "card-context", guid, scanId] as const,
    queryFn: () =>
      unwrapOr(
        apiGet<Result<StorageLocationCardContext | null>>(
          `/api/storage-locations/${guid}/cards/${scanId}/context?unreviewedOnly=true`,
        ),
        null,
      ),
    enabled,
  });

export async function fetchFirstUnreviewedStorageCard(guid: string): Promise<StorageLocationCard | null> {
  const page = await unwrap(
    apiGet<Result<StorageLocationCardPage>>(`/api/storage-locations/${guid}/cards/page?page=1&limit=1&unreviewedOnly=true`),
  );
  return page.cards[0] ?? null;
}

export const storageLocationExportQueryOptions = (guid: string, enabled: boolean) =>
  queryOptions({
    queryKey: ["storage-locations", "export", guid] as const,
    queryFn: () =>
      unwrapOr(apiGet<Result<StorageLocationExportCard[]>>(`/api/storage-locations/${guid}/cards/export`), []),
    enabled,
  });

export const storageSearchQueryOptions = (query: string) =>
  queryOptions({
    queryKey: ["storage-locations", "search", query] as const,
    queryFn: () =>
      unwrapOr(
        apiGet<Result<StorageLocationSearchResult[]>>(`/api/storage-locations/search?q=${encodeURIComponent(query)}`),
        [],
      ),
    enabled: !!query,
    placeholderData: (previous) => previous,
  });

export const cardStorageLocationQueryOptions = (collectionGuid: string, scanId: string) =>
  queryOptions({
    queryKey: ["storage-locations", "card", scanId] as const,
    queryFn: () =>
      unwrapOr(
        apiGet<Result<CardStorageLocation | null>>(`/api/collections/${collectionGuid}/cards/${scanId}/location`),
        null,
      ),
  });

export async function createStorageLocation(name: string): Promise<void> {
  check(await apiPost<Result<unknown>>("/api/storage-locations", { name }));
}

export async function renameStorageLocation(guid: string, name: string): Promise<void> {
  check(await apiPut<Result<unknown>>(`/api/storage-locations/${guid}`, { name }));
}

export async function deleteStorageLocation(guid: string): Promise<void> {
  check(await apiDelete<Result<unknown>>(`/api/storage-locations/${guid}`));
}
