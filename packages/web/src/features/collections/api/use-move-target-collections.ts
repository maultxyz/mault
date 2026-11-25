import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function useMoveTargetCollections(
  sourceCollectionGuids: string | string[] | undefined,
) {
  const sourceGuidsKey = [sourceCollectionGuids ?? []].flat().sort().join(",");
  const { data: collections = [] } = useQuery({
    ...collectionsQueryOptions,
    enabled: sourceGuidsKey !== "",
  });
  return useMemo(() => {
    const sourceGuids = new Set(sourceGuidsKey ? sourceGuidsKey.split(",") : []);
    const sources = collections.filter((collection) =>
      sourceGuids.has(collection.guid),
    );
    if (sources.length === 0 || sources.length !== sourceGuids.size) return [];
    const gameGuids = new Set(sources.map((source) => source.game?.guid ?? null));
    if (gameGuids.size !== 1) return [];
    const [gameGuid] = gameGuids;
    const onlySourceGuid = sources.length === 1 ? sources[0].guid : null;
    return collections.filter(
      (collection) =>
        collection.guid !== onlySourceGuid &&
        (collection.game?.guid ?? null) === gameGuid,
    );
  }, [collections, sourceGuidsKey]);
}
