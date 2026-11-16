import { CardImage } from "@/components/card-image";
import { EmptyState } from "@/components/empty-state";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { MobileSearchInput } from "@/components/mobile-search-input";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { useCollections } from "@/features/collections/api/use-collections";
import { useOrg } from "@/features/companies/api/use-organization";
import {
  catalogCardSearchQueryOptions,
  ownedCardSearchQueryOptions,
  rememberCatalogCard,
} from "@/features/search/api/global-search";
import { SearchResultIcon } from "@/features/search/components/search-result-icon";
import { SearchResultRow } from "@/features/search/components/search-result-row";
import { SearchResultSection } from "@/features/search/components/search-result-section";
import { storageLocationsQueryOptions } from "@/features/storage/api/storage-locations";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { usePriceSource } from "@/hooks/use-price-source";
import { useSettingsSections } from "@/hooks/use-settings-sections";
import { collectionViewPath, monitorCollectionPath } from "@/lib/constants/collections";
import { HOME_PATH, MOBILE_NAV_SCROLL_PADDING_CLASS } from "@/lib/constants/nav";
import { catalogCardPath, SEARCH_QUERY_PARAM, SEARCH_RESULT_THUMBNAIL_CLASS } from "@/lib/constants/search";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import { STORAGE_CARD_SEARCH_PARAM, STORAGE_LOCATION_SEARCH_PARAM, STORAGE_PATH } from "@/lib/constants/storage";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import type { CatalogCardResult } from "@/lib/interfaces/search";
import { cn } from "@/lib/utils";
import {
  catalogGamesOf,
  CATALOG_SEARCH_MIN_QUERY_LENGTH,
  GLOBAL_SEARCH_MIN_QUERY_LENGTH,
  rankGlobalSearchMatches,
  type OwnedCardSearchResult,
} from "@magic-vault/shared";
import { IconAlbum, IconArchive, IconSearch } from "@tabler/icons-react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

export default function SearchPage() {
  const { t } = useTranslation(["search", "settings", "collections"]);
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { activeOrg } = useOrg();
  const { collections, activeCollection } = useCollections();
  const settingsSections = useSettingsSections();
  const { priceOf, format } = usePriceSource();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get(SEARCH_QUERY_PARAM) ?? "";
  const query = search.trim();
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const searchesCards = debouncedQuery.length >= GLOBAL_SEARCH_MIN_QUERY_LENGTH;
  const searchesCatalog = debouncedQuery.length >= CATALOG_SEARCH_MIN_QUERY_LENGTH;
  const isWaitingForDebounce = query.length >= GLOBAL_SEARCH_MIN_QUERY_LENGTH && query !== debouncedQuery;

  const catalogGames = useMemo(
    () => catalogGamesOf(collections, activeCollection?.guid),
    [collections, activeCollection?.guid],
  );
  const catalogQueries = useQueries({
    queries: catalogGames.map((game) => catalogCardSearchQueryOptions(game, debouncedQuery, searchesCatalog)),
  });
  const locations = useQuery(storageLocationsQueryOptions(activeOrg?.id));
  const cards = useQuery(ownedCardSearchQueryOptions(activeOrg?.id, debouncedQuery, searchesCards));

  const matchedCollections = rankGlobalSearchMatches(collections, (collection) => collection.name, query);
  const matchedLocations = rankGlobalSearchMatches(locations.data ?? [], (location) => location.name, query);
  const matchedSettingsSections = rankGlobalSearchMatches(
    settingsSections,
    (section) => t(`settings:${section.labelKey}`),
    query,
  );
  const cardResults = searchesCards ? (cards.data ?? []) : [];
  const catalogResults: CatalogCardResult[] = searchesCatalog
    ? catalogQueries.flatMap((catalogQuery, index) =>
        (catalogQuery.data ?? []).map(({ card, printingCount }) => ({ game: catalogGames[index], card, printingCount })),
      )
    : [];
  const isSearchingCards = searchesCards && cards.isPending;
  const isSearchingCatalog = searchesCatalog && catalogQueries.some((catalogQuery) => catalogQuery.isPending);
  const catalogFailed = searchesCatalog && catalogQueries.some((catalogQuery) => catalogQuery.isError);
  const showsGameName = catalogGames.length > 1;
  const resultCount =
    cardResults.length +
    catalogResults.length +
    matchedCollections.length +
    matchedLocations.length +
    matchedSettingsSections.length;
  const isSettled = !isWaitingForDebounce && !isSearchingCards && !isSearchingCatalog;
  const showsCardsSection = isSearchingCards || isWaitingForDebounce || cardResults.length > 0;
  const showsCatalogSection =
    isSearchingCatalog || (isWaitingForDebounce && catalogGames.length > 0) || catalogResults.length > 0;

  const ownedCardPath = (result: OwnedCardSearchResult) => {
    if (!isMobile) return `${collectionViewPath(result.collectionGuid)}/cards/${result.scanId}`;
    if (!result.locationGuid) return monitorCollectionPath(result.collectionGuid);
    return `${STORAGE_PATH}?${new URLSearchParams({
      [STORAGE_LOCATION_SEARCH_PARAM]: result.locationGuid,
      [STORAGE_CARD_SEARCH_PARAM]: result.scanId,
    })}`;
  };
  const collectionPath = (guid: string) => (isMobile ? monitorCollectionPath(guid) : collectionViewPath(guid));
  const updateSearch = (value: string) =>
    setSearchParams(value ? { [SEARCH_QUERY_PARAM]: value } : {}, { replace: true });

  const searchField = isMobile ? (
    <MobileSearchInput
      autoFocus
      placeholder={t("placeholder")}
      data-hotkey-search
      value={search}
      onChange={(event) => updateSearch(event.target.value)}
    />
  ) : (
    <div className="relative w-full">
      <IconSearch
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-foreground/70"
      />
      <Input
        type="search"
        autoFocus
        aria-label={t("placeholder")}
        placeholder={t("placeholder")}
        data-hotkey-search
        value={search}
        onChange={(event) => updateSearch(event.target.value)}
        className="pl-8"
      />
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isMobile && (
        <MobilePageHeader title={t("title")} backTo={HOME_PATH}>
          {searchField}
        </MobilePageHeader>
      )}
      <div className={cn("min-h-0 flex-1 overflow-y-auto", MOBILE_NAV_SCROLL_PADDING_CLASS)}>
        {!isMobile && (
          <PageHeader title={t("title")} backTo={HOME_PATH}>
            {searchField}
          </PageHeader>
        )}
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:gap-3 md:px-3 md:py-2">
          <p role="status" className="sr-only">
            {query && isSettled ? t("resultsCount", { count: resultCount }) : ""}
          </p>

          {!query ? (
            <EmptyState icon={IconSearch} title={t("promptTitle")} description={t("promptDescription")} />
          ) : (
            <>
              {searchesCards && cards.isError && (
                <LoadErrorCallout message={t("loadFailed")} onRetry={() => void cards.refetch()} />
              )}

              {showsCardsSection && (
                <SearchResultSection title={t("sections.cards")} isLoading={isSearchingCards || isWaitingForDebounce}>
                  {cardResults.map((result) => {
                    const placement = result.locationName
                      ? result.locationPosition != null
                        ? t("locationPosition", { location: result.locationName, position: result.locationPosition })
                        : result.locationName
                      : null;
                    return (
                      <SearchResultRow
                        key={result.scanId}
                        to={ownedCardPath(result)}
                        title={result.cardName}
                        subtitle={[
                          placement,
                          result.collectionName,
                          result.setName ?? result.setCode?.toUpperCase(),
                          result.isFoil ? t("foil") : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                        leading={
                          <span className={SEARCH_RESULT_THUMBNAIL_CLASS}>
                            <CardImage src={result.imageUrl ?? undefined} alt="" />
                          </span>
                        }
                      />
                    );
                  })}
                </SearchResultSection>
              )}

              {showsCatalogSection && (
                <SearchResultSection
                  title={t("sections.catalog")}
                  isLoading={isSearchingCatalog || isWaitingForDebounce}
                >
                  {catalogResults.map(({ game, card, printingCount }) => {
                    const price = priceOf(card, false);
                    return (
                      <SearchResultRow
                        key={`${game.gameKey}-${card.id}`}
                        to={catalogCardPath(game.gameKey, card.id, query)}
                        onNavigate={() => rememberCatalogCard(queryClient, game.gameKey, card)}
                        title={card.name}
                        subtitle={[
                          card.setName || card.set.toUpperCase(),
                          card.collectorNumber ? `#${card.collectorNumber}` : null,
                          showsGameName ? game.gameName : null,
                          price != null ? format(price) : null,
                          printingCount > 1 ? t("printings.count", { count: printingCount }) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                        leading={
                          <span className={SEARCH_RESULT_THUMBNAIL_CLASS}>
                            <CardImage src={card.image?.small} alt="" />
                          </span>
                        }
                      />
                    );
                  })}
                </SearchResultSection>
              )}

              {catalogFailed && (
                <LoadErrorCallout
                  message={t("catalogLoadFailed")}
                  onRetry={() =>
                    catalogQueries
                      .filter((catalogQuery) => catalogQuery.isError)
                      .forEach((catalogQuery) => void catalogQuery.refetch())
                  }
                />
              )}

              {matchedCollections.length > 0 && (
                <SearchResultSection title={t("sections.collections")}>
                  {matchedCollections.map((collection) => (
                    <SearchResultRow
                      key={collection.guid}
                      to={collectionPath(collection.guid)}
                      title={collection.name}
                      subtitle={t("cardsCount", { count: collection.cardCount })}
                      leading={<SearchResultIcon icon={IconAlbum} />}
                    />
                  ))}
                </SearchResultSection>
              )}

              {locations.isError && (
                <LoadErrorCallout message={t("locationsLoadFailed")} onRetry={() => void locations.refetch()} />
              )}

              {matchedLocations.length > 0 && (
                <SearchResultSection title={t("sections.locations")}>
                  {matchedLocations.map((location) => (
                    <SearchResultRow
                      key={location.guid}
                      to={`${STORAGE_PATH}?${new URLSearchParams({ [STORAGE_LOCATION_SEARCH_PARAM]: location.guid })}`}
                      title={location.name}
                      subtitle={t("cardsCount", { count: location.cardCount })}
                      leading={<SearchResultIcon icon={IconArchive} />}
                    />
                  ))}
                </SearchResultSection>
              )}

              {matchedSettingsSections.length > 0 && (
                <SearchResultSection title={t("sections.settings")}>
                  {matchedSettingsSections.map((section) => (
                    <SearchResultRow
                      key={section.path}
                      to={SETTINGS_PATHS[section.path]}
                      title={t(`settings:${section.labelKey}`)}
                      subtitle={t(`settings:sectionIntros.${section.path}`)}
                      leading={<SearchResultIcon icon={section.icon} />}
                    />
                  ))}
                </SearchResultSection>
              )}

              {resultCount === 0 && isSettled && !(searchesCards && cards.isError) && (
                <EmptyState icon={IconSearch} title={t("emptyTitle")} description={t("emptyDescription")} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
