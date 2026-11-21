import { catalogGamesOf } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useScanTarget } from "@/features/collections/api/use-scan-target";
import { gamesQueryOptions } from "@/features/games/api/games";

export function useCatalogGames() {
  const { collections, collection: scanTargetCollection, collectionsQuery } = useScanTarget();
  const games = useQuery(gamesQueryOptions);
  const catalogGames = useMemo(
    () => catalogGamesOf(games.data ?? [], collections, scanTargetCollection?.guid),
    [games.data, collections, scanTargetCollection?.guid],
  );
  return { catalogGames, isLoading: collectionsQuery.isPending || games.isPending };
}
