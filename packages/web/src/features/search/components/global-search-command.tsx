import { CardImage } from "@/components/card-image";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { Command, CommandDialog, CommandGroup, CommandInput, CommandList } from "@/components/ui/command";
import { rememberCatalogCard } from "@/features/search/api/global-search";
import { useGlobalSearchResults } from "@/features/search/api/use-global-search-results";
import { GlobalSearchGameBadges } from "@/features/search/components/global-search-game-badges";
import { GlobalSearchLoadingGroup } from "@/features/search/components/global-search-loading-group";
import { GlobalSearchResultItem } from "@/features/search/components/global-search-result-item";
import { GlobalSearchShowMoreItem } from "@/features/search/components/global-search-show-more-item";
import { SearchResultIcon } from "@/features/search/components/search-result-icon";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { usePriceSource } from "@/hooks/use-price-source";
import { collectionViewPath, monitorCollectionPath } from "@/lib/constants/collections";
import { catalogCardPath, SEARCH_RESULT_THUMBNAIL_CLASS } from "@/lib/constants/search";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import { STORAGE_CARD_SEARCH_PARAM, STORAGE_LOCATION_SEARCH_PARAM, STORAGE_PATH } from "@/lib/constants/storage";
import {
  closeGlobalSearch,
  openGlobalSearch,
  selectGlobalSearchGame,
  useGlobalSearchState,
} from "@/lib/global-search-store";
import type { OwnedCardSearchResult } from "@magic-vault/shared";
import { IconAlbum, IconArchive, IconSearch } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function GlobalSearchCommand() {
  const { t } = useTranslation(["search", "settings"]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { priceOf, format } = usePriceSource();
  const { isOpen, initialQuery, selectedGameKey: requestedGameKey } = useGlobalSearchState();
  const [search, setSearch] = useState(initialQuery);
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setSearch(initialQuery);
  }
  const results = useGlobalSearchResults(search, isOpen, requestedGameKey);

  useHotkeys({
    openGlobalSearch: () => (isOpen ? closeGlobalSearch() : openGlobalSearch()),
  });

  const openPath = (path: string, beforeNavigate?: () => void) => {
    beforeNavigate?.();
    closeGlobalSearch();
    navigate(path);
  };
  const ownedCardPath = (result: OwnedCardSearchResult) => {
    if (!isMobile) return `${collectionViewPath(result.collectionGuid)}/cards/${result.scanId}`;
    if (!result.locationGuid) return monitorCollectionPath(result.collectionGuid);
    return `${STORAGE_PATH}?${new URLSearchParams({
      [STORAGE_LOCATION_SEARCH_PARAM]: result.locationGuid,
      [STORAGE_CARD_SEARCH_PARAM]: result.scanId,
    })}`;
  };
  const collectionPath = (guid: string) => (isMobile ? monitorCollectionPath(guid) : collectionViewPath(guid));

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={(open) => (open ? openGlobalSearch(search) : closeGlobalSearch())}
      title={t("title")}
      description={t("paletteDescription")}
      className="sm:max-w-xl"
    >
      <Command shouldFilter={false} loop label={t("title")}>
        <CommandInput autoFocus value={search} onValueChange={setSearch} placeholder={t("placeholder")} />
        {results.availableGames.length > 1 && (
          <GlobalSearchGameBadges
            label={t("gameFilterLabel")}
            allGamesLabel={t("allGames")}
            games={results.availableGames}
            selectedGameKey={results.selectedGameKey}
            onSelect={selectGlobalSearchGame}
          />
        )}
        <p role="status" className="sr-only">
          {results.query && results.isSettled ? t("resultsCount", { count: results.resultCount }) : ""}
        </p>
        <CommandList>
          {!results.query ? (
            <div className="flex flex-col items-center gap-1 px-4 py-6 text-center">
              <IconSearch aria-hidden="true" className="size-5 text-foreground/70" />
              <p className="text-sm font-medium">{t("promptTitle")}</p>
              <p className="text-xs text-foreground/70">{t("promptDescription")}</p>
            </div>
          ) : (
            <>
              {results.cardsFailed && (
                <div className="p-1">
                  <LoadErrorCallout message={t("loadFailed")} onRetry={results.retryCards} />
                </div>
              )}

              {results.isLoadingCards ? (
                <GlobalSearchLoadingGroup heading={t("sections.cards")} />
              ) : (
                results.cardResults.length > 0 && (
                  <CommandGroup heading={t("sections.cards")}>
                    {results.cardResults.map((result) => {
                      const placement = result.locationName
                        ? result.locationPosition != null
                          ? t("locationPosition", { location: result.locationName, position: result.locationPosition })
                          : result.locationName
                        : null;
                      return (
                        <GlobalSearchResultItem
                          key={result.scanId}
                          value={`card-${result.scanId}`}
                          onSelect={() => openPath(ownedCardPath(result))}
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
                    {results.loadMoreCardsFailed && (
                      <p role="alert" className="px-2.5 py-1.5 text-xs text-destructive">
                        {t("loadMoreFailed")}
                      </p>
                    )}
                    {results.hasMoreCards && (
                      <GlobalSearchShowMoreItem
                        value="show-more-cards"
                        label={results.isLoadingMoreCards ? t("loadingMore") : t("showMoreCards")}
                        isLoading={results.isLoadingMoreCards}
                        onSelect={results.loadMoreCards}
                      />
                    )}
                  </CommandGroup>
                )
              )}

              {results.isLoadingCatalog ? (
                <GlobalSearchLoadingGroup heading={t("sections.catalog")} />
              ) : (
                results.catalogResults.length > 0 && (
                  <CommandGroup heading={t("sections.catalog")}>
                    {results.catalogResults.map(({ game, card, printingCount }) => {
                      const price = priceOf(card, false);
                      return (
                        <GlobalSearchResultItem
                          key={`${game.gameKey}-${card.id}`}
                          value={`catalog-${game.gameKey}-${card.id}`}
                          onSelect={() =>
                            openPath(catalogCardPath(game.gameKey, card.id, results.query), () =>
                              rememberCatalogCard(queryClient, game.gameKey, card),
                            )
                          }
                          title={card.name}
                          subtitle={[
                            card.setName || card.set.toUpperCase(),
                            card.collectorNumber ? `#${card.collectorNumber}` : null,
                            results.showsGameName ? game.gameName : null,
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
                    {results.loadMoreCatalogCardsFailed && (
                      <p role="alert" className="px-2.5 py-1.5 text-xs text-destructive">
                        {t("loadMoreFailed")}
                      </p>
                    )}
                    {results.hasMoreCatalogCards && (
                      <GlobalSearchShowMoreItem
                        value="show-more-catalog-cards"
                        label={results.isLoadingMoreCatalogCards ? t("loadingMore") : t("showMoreCatalogCards")}
                        isLoading={results.isLoadingMoreCatalogCards}
                        onSelect={results.loadMoreCatalogCards}
                      />
                    )}
                  </CommandGroup>
                )
              )}

              {results.catalogFailed && (
                <div className="p-1">
                  <LoadErrorCallout message={t("catalogLoadFailed")} onRetry={results.retryCatalog} />
                </div>
              )}

              {results.matchedCollections.length > 0 && (
                <CommandGroup heading={t("sections.collections")}>
                  {results.matchedCollections.map((collection) => (
                    <GlobalSearchResultItem
                      key={collection.guid}
                      value={`collection-${collection.guid}`}
                      onSelect={() => openPath(collectionPath(collection.guid))}
                      title={collection.name}
                      subtitle={t("cardsCount", { count: collection.cardCount })}
                      leading={<SearchResultIcon icon={IconAlbum} />}
                    />
                  ))}
                </CommandGroup>
              )}

              {results.locationsFailed && (
                <div className="p-1">
                  <LoadErrorCallout message={t("locationsLoadFailed")} onRetry={results.retryLocations} />
                </div>
              )}

              {results.matchedLocations.length > 0 && (
                <CommandGroup heading={t("sections.locations")}>
                  {results.matchedLocations.map((location) => (
                    <GlobalSearchResultItem
                      key={location.guid}
                      value={`location-${location.guid}`}
                      onSelect={() =>
                        openPath(
                          `${STORAGE_PATH}?${new URLSearchParams({ [STORAGE_LOCATION_SEARCH_PARAM]: location.guid })}`,
                        )
                      }
                      title={location.name}
                      subtitle={t("cardsCount", { count: location.cardCount })}
                      leading={<SearchResultIcon icon={IconArchive} />}
                    />
                  ))}
                </CommandGroup>
              )}

              {results.matchedSettingsSections.length > 0 && (
                <CommandGroup heading={t("sections.settings")}>
                  {results.matchedSettingsSections.map((section) => (
                    <GlobalSearchResultItem
                      key={section.path}
                      value={`settings-${section.path}`}
                      onSelect={() => openPath(SETTINGS_PATHS[section.path])}
                      title={t(`settings:${section.labelKey}`)}
                      subtitle={t(`settings:sectionIntros.${section.path}`)}
                      leading={<SearchResultIcon icon={section.icon} />}
                    />
                  ))}
                </CommandGroup>
              )}

              {results.resultCount === 0 && results.isSettled && !results.cardsFailed && (
                <div className="flex flex-col items-center gap-1 px-4 py-6 text-center">
                  <p className="text-sm font-medium">{t("emptyTitle")}</p>
                  <p className="text-xs text-foreground/70">{t("emptyDescription")}</p>
                </div>
              )}
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
