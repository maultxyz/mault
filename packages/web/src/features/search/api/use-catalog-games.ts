import { useCollections } from "@/features/collections/api/use-collections";
import { gamesQueryOptions } from "@/features/games/api/games";
import { catalogGamesOf } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function useCatalogGames() {
  const { collections, activeCollection, isLoading: collectionsLoading } = useCollections();
  const games = useQuery(gamesQueryOptions);
  const catalogGames = useMemo(
    () => catalogGamesOf(games.data ?? [], collections, activeCollection?.guid),
    [games.data, collections, activeCollection?.guid],
  );
  return { catalogGames, isLoading: collectionsLoading || games.isPending };
}
