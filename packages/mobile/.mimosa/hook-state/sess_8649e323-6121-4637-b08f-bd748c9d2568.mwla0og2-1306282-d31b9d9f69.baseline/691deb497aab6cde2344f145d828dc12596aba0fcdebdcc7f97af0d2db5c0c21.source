import type { QueryClient } from "@tanstack/react-query";
import type { StorageLocation } from "@magic-vault/shared";
import {
  storageLocationQueryOptions,
  storageLocationsPageQueryOptions,
  storageLocationsQueryOptions,
} from "@/features/storage/api/storage";
import type { CardCacheSnapshot } from "@/lib/interfaces/undo";

export async function renameStorageLocationInCaches(
  queryClient: QueryClient,
  orgId: string | null,
  guid: string,
  name: string,
): Promise<CardCacheSnapshot> {
  const listKey = storageLocationsQueryOptions(orgId, true).queryKey;
  const pageKey = storageLocationsPageQueryOptions(orgId).queryKey;
  const locationKey = storageLocationQueryOptions(guid).queryKey;
  await Promise.all([listKey, pageKey, locationKey].map((queryKey) => queryClient.cancelQueries({ queryKey })));
  const snapshot: CardCacheSnapshot = [
    [listKey, queryClient.getQueryData(listKey)],
    [pageKey, queryClient.getQueryData(pageKey)],
    [locationKey, queryClient.getQueryData(locationKey)],
  ];
  const renamed = (location: StorageLocation) => (location.guid === guid ? { ...location, name } : location);
  queryClient.setQueryData(listKey, (data) => data?.map(renamed));
  queryClient.setQueryData(pageKey, (data) =>
    data && { ...data, pages: data.pages.map((page) => ({ ...page, items: page.items.map(renamed) })) },
  );
  queryClient.setQueryData(locationKey, (data) => (data ? renamed(data) : data));
  return snapshot;
}
