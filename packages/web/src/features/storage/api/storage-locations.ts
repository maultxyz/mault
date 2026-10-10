import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import type {
  CardStorageLocation,
  Result,
  StorageLocation,
  StorageLocationCard,
  StorageLocationExportCard,
  StorageLocationSearchResult,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const storageLocationKeys = {
  root: () => ["storage-locations"] as const,
  list: (orgId: string | undefined) =>
    [...storageLocationKeys.root(), orgId] as const,
  cards: (guid: string | undefined) =>
    [...storageLocationKeys.root(), "cards", guid] as const,
  export: (guid: string | undefined) =>
    [...storageLocationKeys.root(), "export", guid] as const,
  card: (scanId: string | undefined) =>
    [...storageLocationKeys.root(), "card", scanId] as const,
  search: (query: string) =>
    [...storageLocationKeys.root(), "search", query] as const,
};

export const storageSearchQueryOptions = (query: string) =>
  queryOptions({
    queryKey: storageLocationKeys.search(query),
    queryFn: () =>
      apiGet<Result<StorageLocationSearchResult[]>>(
        `/api/storage-locations/search?q=${encodeURIComponent(query)}`,
      ).then((r) => r.data ?? []),
    enabled: !!query,
    placeholderData: (previous) => previous,
  });

export const storageLocationsQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: storageLocationKeys.list(orgId),
    queryFn: () =>
      apiGet<Result<StorageLocation[]>>("/api/storage-locations").then(
        (r) => r.data ?? [],
      ),
    enabled: !!orgId,
  });

export const storageLocationCardsQueryOptions = (guid: string | undefined) =>
  queryOptions({
    queryKey: storageLocationKeys.cards(guid),
    queryFn: () =>
      apiGet<Result<StorageLocationCard[]>>(
        `/api/storage-locations/${guid}/cards`,
      ).then((r) => r.data ?? []),
    enabled: !!guid,
  });

export const storageLocationExportQueryOptions = (
  guid: string | undefined,
  enabled: boolean,
) =>
  queryOptions({
    queryKey: storageLocationKeys.export(guid),
    queryFn: () =>
      apiGet<Result<StorageLocationExportCard[]>>(
        `/api/storage-locations/${guid}/cards/export`,
      ).then((r) => r.data ?? []),
    enabled: !!guid && enabled,
  });

export const cardStorageLocationQueryOptions = (
  collectionGuid: string | undefined,
  scanId: string | undefined,
) =>
  queryOptions({
    queryKey: storageLocationKeys.card(scanId),
    queryFn: () =>
      apiGet<Result<CardStorageLocation | null>>(
        `/api/collections/${collectionGuid}/cards/${scanId}/location`,
      ).then((r) => r.data ?? null),
    enabled: !!collectionGuid && !!scanId,
  });

export function createStorageLocation(
  name: string,
): Promise<Result<{ guid: string; locations: StorageLocation[] }>> {
  return apiPost("/api/storage-locations", { name });
}

export function renameStorageLocation(
  guid: string,
  name: string,
): Promise<Result<StorageLocation[]>> {
  return apiPut(`/api/storage-locations/${guid}`, { name });
}

export function removeCardFromStorageLocation(
  guid: string,
  scanId: string,
): Promise<Result<StorageLocation[]>> {
  return apiDelete(`/api/storage-locations/${guid}/cards/${scanId}`);
}

export function deleteStorageLocation(
  guid: string,
): Promise<Result<StorageLocation[]>> {
  return apiDelete(`/api/storage-locations/${guid}`);
}
