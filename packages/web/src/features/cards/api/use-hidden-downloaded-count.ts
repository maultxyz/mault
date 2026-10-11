import { collectionCardsSummaryQueryOptions } from "@/features/collections/api/collection-cards";
import { useCollections } from "@/features/collections/api/use-collections";
import type { CollectionCardsQuery } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";

export function useHiddenDownloadedCount(
  query: CollectionCardsQuery,
  enabled: boolean,
): number {
  const { activeCollection } = useCollections();
  const active = enabled && !query.filters.showDownloaded;
  const { data } = useQuery({
    ...collectionCardsSummaryQueryOptions(activeCollection?.guid, {
      ...query,
      filters: { ...query.filters, showDownloaded: true },
    }),
    enabled: active && !!activeCollection?.guid,
    placeholderData: undefined,
  });
  return active ? (data?.filtered.totalCount ?? 0) : 0;
}
