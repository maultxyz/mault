import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import type {
  CardStorageLocation,
  PagedList,
  Result,
  StorageLocation,
  StorageLocationCardContext,
  StorageLocationCardPage,
  StorageLocationExportCard,
  StorageLocationSearchResult,
} from "@magic-vault/shared";
import { pageRequestParams } from "@/lib/api/page-request";
import type { PageRequest } from "@/lib/interfaces/pagination";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

export const storageLocationKeys = {
  root: () => ["storage-locations"] as const,
  list: (orgId: string | undefined) =>
    [...storageLocationKeys.root(), orgId] as const,
  page: (orgId: string | undefined, request: PageRequest) =>
    [...storageLocationKeys.root(), "page", orgId, request] as const,
  location: (guid: string | undefined) =>
    [...storageLocationKeys.root(), "location", guid] as const,
  cards: (guid: string | undefined) =>
    [...storageLocationKeys.root(), "cards", guid] as const,
  cardPages: (guid: string | undefined) =>
    [...storageLocationKeys.cards(guid), "page"] as const,
  cardPage: (guid: string | undefined, page: number) =>
    [...storageLocationKeys.cardPages(guid), page] as const,
  unreviewedCards: (guid: string | undefined) =>
    [...storageLocationKeys.cards(guid), "unreviewed"] as const,
  cardContexts: (guid: string | undefined) =>
    [...storageLocationKeys.cards(guid), "context"] as const,
  cardContext: (
    guid: string | undefined,
    scanId: string | undefined,
    unreviewedOnly: boolean,
  ) => [...storageLocationKeys.cardContexts(guid), scanId, unreviewedOnly] as const,
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

export const storageLocationPageQueryOptions = (
  orgId: string | undefined,
  request: PageRequest,
) =>
  queryOptions({
    queryKey: storageLocationKeys.page(orgId, request),
    queryFn: () =>
      apiGet<Result<PagedList<StorageLocation>>>(
        `/api/storage-locations/page?${pageRequestParams(request)}`,
      ).then((r) => r.data ?? null),
    enabled: !!orgId,
    placeholderData: keepPreviousData,
  });

export const storageLocationQueryOptions = (guid: string | undefined) =>
  queryOptions({
    queryKey: storageLocationKeys.location(guid),
    queryFn: () =>
      apiGet<Result<StorageLocation>>(`/api/storage-locations/${guid}`).then(
        (r) => r.data ?? null,
      ),
    enabled: !!guid,
  });

export const storageLocationCardPageQueryOptions = (
  guid: string | undefined,
  page: number,
) =>
  queryOptions({
    queryKey: storageLocationKeys.cardPage(guid, page),
    queryFn: () =>
      apiGet<Result<StorageLocationCardPage>>(
        `/api/storage-locations/${guid}/cards/page?page=${page}`,
      ).then((r) => r.data ?? null),
    enabled: !!guid,
    placeholderData: (previous) => previous,
  });

export const storageLocationUnreviewedCardsQueryOptions = (
  guid: string | undefined,
  enabled: boolean,
) =>
  queryOptions({
    queryKey: storageLocationKeys.unreviewedCards(guid),
    queryFn: () =>
      apiGet<Result<StorageLocationCardPage>>(
        `/api/storage-locations/${guid}/cards/page?page=1&unreviewedOnly=true`,
      ).then((r) => r.data ?? null),
    enabled: !!guid && enabled,
  });

export const storageLocationCardContextQueryOptions = (
  guid: string | undefined,
  scanId: string | undefined,
  unreviewedOnly: boolean,
) =>
  queryOptions({
    queryKey: storageLocationKeys.cardContext(guid, scanId, unreviewedOnly),
    queryFn: () =>
      apiGet<Result<StorageLocationCardContext | null>>(
        `/api/storage-locations/${guid}/cards/${scanId}/context${unreviewedOnly ? "?unreviewedOnly=true" : ""}`,
      ).then((r) => r.data ?? null),
    enabled: !!guid && !!scanId,
  });

export function fetchNextUnreviewedStorageCard(
  guid: string,
): Promise<string | null> {
  return apiGet<Result<string | null>>(
    `/api/storage-locations/${guid}/cards/next-unreviewed`,
  ).then((r) => r.data ?? null);
}

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
): Promise<Result<{ guid: string }>> {
  return apiPost("/api/storage-locations", { name });
}

export function moveCardsToStorageLocation(
  guid: string,
  scanIds: string[],
): Promise<Result<{ moved: number }>> {
  return apiPost(`/api/storage-locations/${guid}/cards`, { scanIds });
}

export function markStorageLocationCardsDownloaded(
  guid: string,
  scanIds: string[],
): Promise<Result<null>> {
  return apiPost(`/api/storage-locations/${guid}/cards/mark-downloaded`, {
    scanIds,
  });
}

export function moveCollectionToStorageLocation(
  guid: string,
  collectionGuid: string,
): Promise<Result<{ moved: number }>> {
  return apiPost(`/api/storage-locations/${guid}/cards/from-collection`, {
    collectionGuid,
  });
}

export function renameStorageLocation(
  guid: string,
  name: string,
): Promise<Result<null>> {
  return apiPut(`/api/storage-locations/${guid}`, { name });
}

export function removeCardFromStorageLocation(
  guid: string,
  scanId: string,
): Promise<Result<null>> {
  return apiDelete(`/api/storage-locations/${guid}/cards/${scanId}`);
}

export function deleteStorageLocation(
  guid: string,
): Promise<Result<null>> {
  return apiDelete(`/api/storage-locations/${guid}`);
}
