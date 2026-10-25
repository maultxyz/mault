import { queryOptions } from "@tanstack/react-query";
import type {
  CardStorageLocation,
  Result,
  StorageLocation,
  StorageLocationCard,
  StorageLocationExportCard,
  StorageLocationSearchResult,
} from "@magic-vault/shared";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";

function check(result: { success: boolean; message?: string }): void {
  if (!result.success) throw new Error(result.message ?? "Request failed.");
}

export const storageLocationsQueryOptions = (orgId: string | null) =>
  queryOptions({
    queryKey: ["storage-locations", orgId] as const,
    queryFn: () => apiGet<Result<StorageLocation[]>>("/api/storage-locations").then((r) => r.data ?? []),
    enabled: !!orgId,
  });

export const storageLocationCardsQueryOptions = (guid: string) =>
  queryOptions({
    queryKey: ["storage-locations", "cards", guid] as const,
    queryFn: () => apiGet<Result<StorageLocationCard[]>>(`/api/storage-locations/${guid}/cards`).then((r) => r.data ?? []),
  });

export const storageLocationExportQueryOptions = (guid: string, enabled: boolean) =>
  queryOptions({
    queryKey: ["storage-locations", "export", guid] as const,
    queryFn: () =>
      apiGet<Result<StorageLocationExportCard[]>>(`/api/storage-locations/${guid}/cards/export`).then(
        (r) => r.data ?? [],
      ),
    enabled,
  });

export const storageSearchQueryOptions = (query: string) =>
  queryOptions({
    queryKey: ["storage-locations", "search", query] as const,
    queryFn: () =>
      apiGet<Result<StorageLocationSearchResult[]>>(`/api/storage-locations/search?q=${encodeURIComponent(query)}`).then(
        (r) => r.data ?? [],
      ),
    enabled: !!query,
    placeholderData: (previous) => previous,
  });

export const cardStorageLocationQueryOptions = (collectionGuid: string, scanId: string) =>
  queryOptions({
    queryKey: ["storage-locations", "card", scanId] as const,
    queryFn: () =>
      apiGet<Result<CardStorageLocation | null>>(`/api/collections/${collectionGuid}/cards/${scanId}/location`).then(
        (r) => r.data ?? null,
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
