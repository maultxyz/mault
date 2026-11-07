import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import type {
  CardStorageLocation,
  CollectionCardsQuery,
  PagedList,
  Result,
  StorageLocation,
  StorageLocationCardContext,
  StorageLocationCardPage,
  StorageLocationCardsSummary,
  StorageLocationExportSummary,
  StorageLocationSearchResult,
  PickListEntryInput,
  StoragePickList,
  StorageRemoveCardsResult,
} from "@magic-vault/shared";
import { STORAGE_CARDS_PAGE_SIZE_MAX } from "@magic-vault/shared";
import { cardsQueryParams } from "@/features/collections/api/collection-cards";
import { pageRequestParams } from "@/lib/api/page-request";
import { ALL_CARDS_QUERY } from "@/lib/constants/card-filters";
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
  cardPage: (
    guid: string | undefined,
    query: CollectionCardsQuery,
    page: number,
  ) => [...storageLocationKeys.cardPages(guid), query, page] as const,
  summary: (guid: string | undefined) =>
    [...storageLocationKeys.cards(guid), "summary"] as const,
  unreviewedCards: (guid: string | undefined) =>
    [...storageLocationKeys.cards(guid), "unreviewed"] as const,
  cardContexts: (guid: string | undefined) =>
    [...storageLocationKeys.cards(guid), "context"] as const,
  cardContext: (
    guid: string | undefined,
    scanId: string | undefined,
    unreviewedOnly: boolean,
    query: CollectionCardsQuery,
  ) =>
    [
      ...storageLocationKeys.cardContexts(guid),
      scanId,
      unreviewedOnly,
      query,
    ] as const,
  export: (guid: string | undefined) =>
    [...storageLocationKeys.root(), "export", guid] as const,
  card: (scanId: string | undefined) =>
    [...storageLocationKeys.root(), "card", scanId] as const,
  search: (query: string) =>
    [...storageLocationKeys.root(), "search", query] as const,
  pickList: (orgId: string | undefined, entries: PickListEntryInput[]) =>
    [...storageLocationKeys.root(), "pick-list", orgId, entries] as const,
  verifyCards: (guid: string | undefined) =>
    [...storageLocationKeys.root(), "verify-cards", guid] as const,
};

export const storageVerifyCardsQueryOptions = (guid: string | undefined) =>
  queryOptions({
    queryKey: storageLocationKeys.verifyCards(guid),
    queryFn: () =>
      apiGet<Result<StorageLocationSearchResult[]>>(
        `/api/storage-locations/${guid}/cards/verify`,
      ).then((r) => {
        if (!r.success || !r.data) throw new Error(r.message);
        return r.data;
      }),
    enabled: !!guid,
  });

export const storagePickListQueryOptions = (
  orgId: string | undefined,
  entries: PickListEntryInput[],
) =>
  queryOptions({
    queryKey: storageLocationKeys.pickList(orgId, entries),
    queryFn: () =>
      apiPost<Result<StoragePickList>>("/api/storage-locations/pick-list", {
        entries,
      }).then((r) => {
        if (!r.success || !r.data) throw new Error(r.message);
        return r.data;
      }),
    enabled: !!orgId && entries.length > 0,
    placeholderData: keepPreviousData,
  });

export function removeCardsFromStorageLocations(
  scanIds: string[],
): Promise<Result<StorageRemoveCardsResult>> {
  return apiPost("/api/storage-locations/remove-cards", { scanIds });
}

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
  query: CollectionCardsQuery,
  page: number,
) =>
  queryOptions({
    queryKey: storageLocationKeys.cardPage(guid, query, page),
    queryFn: () =>
      apiGet<Result<StorageLocationCardPage>>(
        `/api/storage-locations/${guid}/cards/page?${cardsQueryParams(query, { page: String(page) })}`,
      ).then((r) => r.data ?? null),
    enabled: !!guid,
    placeholderData: (previous) => previous,
  });

export function fetchStorageUnreviewedCardsPage(
  guid: string,
  page: number,
): Promise<StorageLocationCardPage> {
  return apiGet<Result<StorageLocationCardPage>>(
    `/api/storage-locations/${guid}/cards/page?page=${page}&limit=${STORAGE_CARDS_PAGE_SIZE_MAX}&unreviewedOnly=true`,
  ).then((r) => {
    if (!r.success || !r.data) throw new Error(r.message);
    return r.data;
  });
}

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
  query: CollectionCardsQuery = ALL_CARDS_QUERY,
) =>
  queryOptions({
    queryKey: storageLocationKeys.cardContext(
      guid,
      scanId,
      unreviewedOnly,
      query,
    ),
    queryFn: () =>
      apiGet<Result<StorageLocationCardContext | null>>(
        `/api/storage-locations/${guid}/cards/${scanId}/context?${cardsQueryParams(
          query,
          unreviewedOnly ? { unreviewedOnly: "true" } : {},
        )}`,
      ).then((r) => r.data ?? null),
    enabled: !!guid && !!scanId,
  });

export const storageLocationCardsSummaryQueryOptions = (
  guid: string | undefined,
) =>
  queryOptions({
    queryKey: storageLocationKeys.summary(guid),
    queryFn: () =>
      apiGet<Result<StorageLocationCardsSummary>>(
        `/api/storage-locations/${guid}/cards/summary`,
      ).then((r) => r.data ?? null),
    enabled: !!guid,
  });

export function fetchNextUnreviewedStorageCard(
  guid: string,
): Promise<string | null> {
  return apiGet<Result<string | null>>(
    `/api/storage-locations/${guid}/cards/next-unreviewed`,
  ).then((r) => r.data ?? null);
}

export const storageLocationExportSummaryQueryOptions = (
  guid: string | undefined,
  enabled: boolean,
) =>
  queryOptions({
    queryKey: storageLocationKeys.export(guid),
    queryFn: () =>
      apiGet<Result<StorageLocationExportSummary>>(
        `/api/storage-locations/${guid}/cards/export-summary`,
      ).then((r) => r.data ?? { gameKeys: [], scanIds: [] }),
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

export function deleteStorageLocation(guid: string): Promise<Result<null>> {
  return apiDelete(`/api/storage-locations/${guid}`);
}
