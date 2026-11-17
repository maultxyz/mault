import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function useMoveTargetCollections(sourceCollectionGuid: string | undefined) {
  const { data: collections = [] } = useQuery({
    ...collectionsQueryOptions,
    enabled: !!sourceCollectionGuid,
  });
  return useMemo(() => {
    const source = collections.find(
      (collection) => collection.guid === sourceCollectionGuid,
    );
    if (!source) return [];
    return collections.filter(
      (collection) =>
        collection.guid !== source.guid &&
        (collection.game?.guid ?? null) === (source.game?.guid ?? null),
    );
  }, [collections, sourceCollectionGuid]);
}
