import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, ScrollView, View } from "react-native";
import { CardThumbnail } from "@/components/cards/card-thumbnail";
import { cardArtSources } from "@/lib/card-art";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { SearchInput } from "@/components/ui/search-input";
import { SectionHeader } from "@/components/ui/section-header";
import { useScanTarget } from "@/features/collections/api/use-scan-target";
import { FilterChip } from "@/features/collections/components/filter-chip";
import { catalogCardsSearchQueryOptions, rememberCatalogCard } from "@/features/search/api/catalog-card-search";
import { ownedCardSearchQueryOptions } from "@/features/search/api/owned-card-search";
import { searchLocally } from "@/features/search/lib/global-search";
import { storageLocationsQueryOptions } from "@/features/storage/api/storage";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePricing } from "@/hooks/use-pricing";
import { useActiveOrgId } from "@/hooks/use-org";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/collections";
import { SETTINGS_SECTION_LINKS } from "@/lib/constants/settings";
import { SPACING } from "@/lib/constants/theme";
import { absoluteUrl } from "@/lib/url";
import {
  CATALOG_SEARCH_MIN_QUERY_LENGTH,
  catalogGamesOf,
  GLOBAL_SEARCH_MIN_QUERY_LENGTH,
  globalSearchGamesFor,
  isGlobalSearchGameSelected,
  selectedGlobalSearchGameKey,
} from "@magic-vault/shared";

export default function GlobalSearchScreen() {
  const { t } = useTranslation();
  const orgId = useActiveOrgId();
  const [search, setSearch] = useState("");
  const query = search.trim();
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const searchesCards = debouncedQuery.length >= GLOBAL_SEARCH_MIN_QUERY_LENGTH;
  const searchesCatalog = debouncedQuery.length >= CATALOG_SEARCH_MIN_QUERY_LENGTH;
  const { collections, collection: scanTargetCollection } = useScanTarget();
  const queryClient = useQueryClient();
  const pricing = usePricing();
  const [requestedGameKey, setRequestedGameKey] = useState<string | null>(null);
  const availableGames = useMemo(
    () => catalogGamesOf(collections, scanTargetCollection?.guid),
    [collections, scanTargetCollection?.guid],
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
  const locations = useQuery(storageLocationsQueryOptions(orgId, true));
  const cards = useInfiniteQuery(ownedCardSearchQueryOptions(orgId, debouncedQuery, selectedGameKey, searchesCards));
  const localResults = useMemo(
    () =>
      searchLocally(query, searchableCollections, locations.data ?? [], SETTINGS_SECTION_LINKS, (section) =>
        t(`settings.sections.${section.key}.title`),
      ),
    [query, searchableCollections, locations.data, t],
  );
  const cardResults = searchesCards ? (cards.data?.pages.flatMap((page) => page.results) ?? []) : [];
  const catalogResults = searchesCatalog ? (catalog.data?.pages.flatMap((page) => page.results) ?? []) : [];
  const isSearchingCatalog = searchesCatalog && catalog.isLoading;
  const catalogFailed = searchesCatalog && catalog.isError && !catalog.isFetchNextPageError;
  const cardsFailed = cards.isError && !cards.isFetchNextPageError;
  const showsGameName = catalogGames.length > 1;
  const isSearchingCards = searchesCards && cards.isLoading;
  const isWaitingForDebounce = query.length >= GLOBAL_SEARCH_MIN_QUERY_LENGTH && query !== debouncedQuery;
  const resultCount =
    cardResults.length +
    catalogResults.length +
    localResults.collections.length +
    localResults.locations.length +
    localResults.settingsSections.length;
  useEffect(() => {
    if (!searchesCards || !cards.isSuccess || isSearchingCatalog || debouncedQuery !== query) return;
    AccessibilityInfo.announceForAccessibility(t("search.resultsCount", { count: resultCount }));
  }, [searchesCards, cards.isSuccess, cards.dataUpdatedAt, isSearchingCatalog, debouncedQuery, query, resultCount, t]);
  const hasAnyResult =
    cardResults.length > 0 ||
    catalogResults.length > 0 ||
    localResults.collections.length > 0 ||
    localResults.locations.length > 0 ||
    localResults.settingsSections.length > 0;

  return (
    <Screen
      onRefresh={() => Promise.all([locations.refetch(), searchesCards ? cards.refetch() : null])}
      header={<PageHeader title={t("search.title")} onBack={() => router.back()} />}
    >
      <SearchInput
        value={search}
        onChangeText={setSearch}
        placeholder={t("search.placeholder")}
        accessibilityLabel={t("search.placeholder")}
      />

      {availableGames.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityRole="radiogroup"
          accessibilityLabel={t("search.gameFilterLabel")}
          contentContainerStyle={{ gap: SPACING.sm }}
        >
          <FilterChip
            label={t("search.allGames")}
            selected={selectedGameKey === null}
            selectionRole="radio"
            onPress={() => setRequestedGameKey(null)}
          />
          {availableGames.map((game) => (
            <FilterChip
              key={game.gameKey}
              label={game.gameName}
              selected={selectedGameKey === game.gameKey}
              selectionRole="radio"
              onPress={() => setRequestedGameKey(game.gameKey)}
            />
          ))}
        </ScrollView>
      ) : null}

      {!query ? (
        <EmptyState icon="search" title={t("search.promptTitle")} description={t("search.promptDescription")} />
      ) : (
        <>
          {cardsFailed ? <Callout tone="destructive" title={t("search.loadFailed")} /> : null}

          {isSearchingCards || isWaitingForDebounce || cardResults.length > 0 ? (
            <View style={{ gap: SPACING.sm }}>
              <SectionHeader title={t("search.sections.cards")} />
              {isSearchingCards || isWaitingForDebounce ? (
                <ListSkeleton rows={3} />
              ) : (
                <ListGroup>
                  {cardResults.map((result) => {
                    const placement = result.locationName
                      ? result.locationPosition != null
                        ? t("search.locationPosition", { location: result.locationName, position: result.locationPosition })
                        : result.locationName
                      : null;
                    const imageUrl = absoluteUrl(result.imageUrl);
                    return (
                      <ListRow
                        key={result.scanId}
                        title={result.cardName}
                        subtitle={[
                          placement,
                          result.collectionName,
                          result.setName ?? result.setCode?.toUpperCase(),
                          result.isFoil ? t("search.foil") : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                        leading={<CardThumbnail imageUrl={imageUrl} />}
                        onPress={() =>
                          router.push({
                            pathname: "/card/[scanId]",
                            params: { scanId: result.scanId, guid: result.collectionGuid },
                          })
                        }
                      />
                    );
                  })}
                  {searchesCards && cards.hasNextPage ? (
                    <ListRow
                      icon="expand"
                      title={cards.isFetchingNextPage ? t("search.loadingMore") : t("search.showMoreCards")}
                      subtitle={cards.isFetchNextPageError ? t("search.loadMoreFailed") : undefined}
                      tone={cards.isFetchNextPageError ? "destructive" : "default"}
                      disabled={cards.isFetchingNextPage}
                      onPress={() => void cards.fetchNextPage()}
                    />
                  ) : null}
                </ListGroup>
              )}
            </View>
          ) : null}

          {isSearchingCatalog || (isWaitingForDebounce && catalogGames.length > 0) || catalogResults.length > 0 ? (
            <View style={{ gap: SPACING.sm }}>
              <SectionHeader title={t("search.sections.catalog")} />
              {isSearchingCatalog || isWaitingForDebounce ? (
                <ListSkeleton rows={3} />
              ) : (
                <ListGroup>
                  {catalogResults.map(({ game, card, printingCount }) => {
                    const artSources = cardArtSources(card.image);
                    const price = pricing.priceOf(card);
                    return (
                      <ListRow
                        key={`${game.gameKey}-${card.id}`}
                        title={card.name}
                        subtitle={[
                          card.setName || card.set.toUpperCase(),
                          card.collectorNumber ? `#${card.collectorNumber}` : null,
                          showsGameName ? game.gameName : null,
                          price != null ? pricing.format(price) : null,
                          printingCount > 1 ? t("search.printings.count", { count: printingCount }) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                        leading={<CardThumbnail {...artSources} />}
                        onPress={() => {
                          rememberCatalogCard(queryClient, game.gameKey, card);
                          router.push({ pathname: "/catalog-card", params: { id: card.id, gameKey: game.gameKey } });
                        }}
                      />
                    );
                  })}
                  {searchesCatalog && catalog.hasNextPage ? (
                    <ListRow
                      icon="expand"
                      title={catalog.isFetchingNextPage ? t("search.loadingMore") : t("search.showMoreCatalogCards")}
                      subtitle={catalog.isFetchNextPageError ? t("search.loadMoreFailed") : undefined}
                      tone={catalog.isFetchNextPageError ? "destructive" : "default"}
                      disabled={catalog.isFetchingNextPage}
                      onPress={() => void catalog.fetchNextPage()}
                    />
                  ) : null}
                </ListGroup>
              )}
            </View>
          ) : null}

          {catalogFailed ? <Callout tone="destructive" title={t("search.catalogLoadFailed")} /> : null}

          {localResults.collections.length > 0 ? (
            <View style={{ gap: SPACING.sm }}>
              <SectionHeader title={t("search.sections.collections")} />
              <ListGroup>
                {localResults.collections.map((collection) => (
                  <ListRow
                    key={collection.guid}
                    icon="collections"
                    title={collection.name}
                    subtitle={t("collection.cardsCount", { count: collection.cardCount })}
                    onPress={() => router.push({ pathname: "/collection/[guid]", params: { guid: collection.guid } })}
                  />
                ))}
              </ListGroup>
            </View>
          ) : null}

          {localResults.locations.length > 0 ? (
            <View style={{ gap: SPACING.sm }}>
              <SectionHeader title={t("search.sections.locations")} />
              <ListGroup>
                {localResults.locations.map((location) => (
                  <ListRow
                    key={location.guid}
                    icon="storage"
                    title={location.name}
                    subtitle={t("collection.cardsCount", { count: location.cardCount })}
                    onPress={() => router.push({ pathname: "/storage/[guid]", params: { guid: location.guid } })}
                  />
                ))}
              </ListGroup>
            </View>
          ) : null}

          {localResults.settingsSections.length > 0 ? (
            <View style={{ gap: SPACING.sm }}>
              <SectionHeader title={t("search.sections.settings")} />
              <ListGroup>
                {localResults.settingsSections.map((section) => (
                  <ListRow
                    key={section.path}
                    icon={section.icon}
                    title={t(`settings.sections.${section.key}.title`)}
                    subtitle={t(`settings.sections.${section.key}.description`)}
                    onPress={() => router.push(section.path)}
                  />
                ))}
              </ListGroup>
            </View>
          ) : null}

          {!hasAnyResult && !isSearchingCards && !isSearchingCatalog && !isWaitingForDebounce && !cardsFailed ? (
            <EmptyState icon="search" title={t("search.emptyTitle")} description={t("search.emptyDescription")} />
          ) : null}
        </>
      )}
    </Screen>
  );
}
