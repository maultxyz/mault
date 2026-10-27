import { collectionCardsCountQueryOptions } from "@/features/collections/api/collection-cards";
import { useViewedCollection } from "@/features/collections/api/use-viewed-collection";
import type { CollectionCardsQuery } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";

export function useHiddenDownloadedCount(
  query: CollectionCardsQuery,
  enabled: boolean,
): number {
  const { collection: activeCollection } = useViewedCollection();
  const active = enabled && !query.filters.showDownloaded;
  const { data } = useQuery({
    ...collectionCardsCountQueryOptions(activeCollection?.guid, {
      ...query,
      filters: { ...query.filters, showDownloaded: true },
    }),
    enabled: active && !!activeCollection?.guid,
    placeholderData: undefined,
  });
  return active ? (data?.totalCount ?? 0) : 0;
}
