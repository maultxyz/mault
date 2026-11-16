import { useCollections } from "@/features/collections/api/use-collections";
import { useOrg } from "@/features/companies/api/use-organization";
import {
  catalogCardsSearchQueryOptions,
  ownedCardSearchQueryOptions,
} from "@/features/search/api/global-search";
import { storageLocationsQueryOptions } from "@/features/storage/api/storage-locations";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSettingsSections } from "@/hooks/use-settings-sections";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import {
  catalogGamesOf,
  globalSearchGamesFor,
  isGlobalSearchGameSelected,
  selectedGlobalSearchGameKey,
  CATALOG_SEARCH_MIN_QUERY_LENGTH,
  GLOBAL_SEARCH_MIN_QUERY_LENGTH,
  rankGlobalSearchMatches,
} from "@magic-vault/shared";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function useGlobalSearchResults(search: string, isSearchOpen: boolean, requestedGameKey: string | null) {
  const { t } = useTranslation("settings");
  const { activeOrg } = useOrg();
  const { collections, activeCollection } = useCollections();
  const settingsSections = useSettingsSections();
  const query = search.trim();
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const searchesCards = isSearchOpen && debouncedQuery.length >= GLOBAL_SEARCH_MIN_QUERY_LENGTH;
  const searchesCatalog = isSearchOpen && debouncedQuery.length >= CATALOG_SEARCH_MIN_QUERY_LENGTH;
  const isWaitingForDebounce = query.length >= GLOBAL_SEARCH_MIN_QUERY_LENGTH && query !== debouncedQuery;

  const availableGames = useMemo(
    () => catalogGamesOf(collections, activeCollection?.guid),
    [collections, activeCollection?.guid],
  );
  const selectedGameKey = selectedGlobalSearchGameKey(availableGames, requestedGameKey);
  const catalogGames = useMemo(
    () => globalSearchGamesFor(availableGames, selectedGameKey),
    [availableGames, selectedGameKey],
  );
  const searchableCollections = useMemo(
    () => collections.filter((collection) => isGlobalSearchGameSelected(selectedGameKey, collection.game?.key)),
    [collections, selectedGameKey],
  );
  const catalog = useInfiniteQuery(catalogCardsSearchQueryOptions(catalogGames, debouncedQuery, searchesCatalog));
  const locations = useQuery({ ...storageLocationsQueryOptions(activeOrg?.id), enabled: !!activeOrg?.id && isSearchOpen });
  const cards = useInfiniteQuery(
    ownedCardSearchQueryOptions(activeOrg?.id, debouncedQuery, selectedGameKey, searchesCards),
  );

  const matchedCollections = query ? rankGlobalSearchMatches(searchableCollections, (collection) => collection.name, query) : [];
  const matchedLocations = query
    ? rankGlobalSearchMatches(locations.data ?? [], (location) => location.name, query)
    : [];
  const matchedSettingsSections = query
    ? rankGlobalSearchMatches(settingsSections, (section) => t(section.labelKey), query)
    : [];
  const cardResults = searchesCards ? (cards.data?.pages.flatMap((page) => page.results) ?? []) : [];
  const catalogResults = searchesCatalog ? (catalog.data?.pages.flatMap((page) => page.results) ?? []) : [];
  const isSearchingCards = searchesCards && cards.isPending;
  const isSearchingCatalog = searchesCatalog && catalogGames.length > 0 && catalog.isPending;
  const catalogFailed = searchesCatalog && catalog.isError && !catalog.isFetchNextPageError;
  const resultCount =
    cardResults.length +
    catalogResults.length +
    matchedCollections.length +
    matchedLocations.length +
    matchedSettingsSections.length;

  return {
    query,
    availableGames,
    selectedGameKey,
    cardResults,
    catalogResults,
    matchedCollections,
    matchedLocations,
    matchedSettingsSections,
    resultCount,
    showsGameName: catalogGames.length > 1,
    isLoadingCards: isSearchingCards || isWaitingForDebounce,
    isLoadingCatalog: isSearchingCatalog || (isWaitingForDebounce && catalogGames.length > 0),
    isSettled: !isWaitingForDebounce && !isSearchingCards && !isSearchingCatalog,
    cardsFailed: searchesCards && cards.isError && !cards.isFetchNextPageError,
    catalogFailed,
    locationsFailed: locations.isError,
    hasMoreCards: searchesCards && !!cards.hasNextPage,
    isLoadingMoreCards: cards.isFetchingNextPage,
    loadMoreCardsFailed: cards.isFetchNextPageError,
    loadMoreCards: () => void cards.fetchNextPage(),
    hasMoreCatalogCards: searchesCatalog && !!catalog.hasNextPage,
    isLoadingMoreCatalogCards: catalog.isFetchingNextPage,
    loadMoreCatalogCardsFailed: catalog.isFetchNextPageError,
    loadMoreCatalogCards: () => void catalog.fetchNextPage(),
    retryCards: () => void cards.refetch(),
    retryCatalog: () => void catalog.refetch(),
    retryLocations: () => void locations.refetch(),
  };
}
