import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, View } from "react-native";
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
import { ownedCardSearchQueryOptions } from "@/features/search/api/owned-card-search";
import { searchLocally } from "@/features/search/lib/global-search";
import { storageLocationsQueryOptions } from "@/features/storage/api/storage";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { CARD_ASPECT_RATIO, SEARCH_DEBOUNCE_MS } from "@/lib/constants/collections";
import { GLOBAL_SEARCH_MIN_QUERY_LENGTH } from "@/lib/constants/search";
import { SETTINGS_SECTION_LINKS } from "@/lib/constants/settings";
import { CARD_THUMBNAIL_RADIUS, SPACING } from "@/lib/constants/theme";
import { LIST_ROW_ICON_SIZE } from "@/lib/constants/ui";
import { absoluteUrl } from "@/lib/url";

export default function GlobalSearchScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const orgId = useActiveOrgId();
  const [search, setSearch] = useState("");
  const query = search.trim();
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const searchesCards = debouncedQuery.length >= GLOBAL_SEARCH_MIN_QUERY_LENGTH;
  const { collections } = useScanTarget();
  const locations = useQuery(storageLocationsQueryOptions(orgId, true));
  const cards = useQuery(ownedCardSearchQueryOptions(orgId, debouncedQuery, searchesCards));
  const localResults = useMemo(
    () =>
      searchLocally(query, collections, locations.data ?? [], SETTINGS_SECTION_LINKS, (section) =>
        t(`settings.sections.${section.key}.title`),
      ),
    [query, collections, locations.data, t],
  );
  const cardResults = searchesCards ? (cards.data ?? []) : [];
  const isSearchingCards = searchesCards && cards.isLoading;
  const isWaitingForDebounce = query.length >= GLOBAL_SEARCH_MIN_QUERY_LENGTH && query !== debouncedQuery;
  const resultCount =
    cardResults.length +
    localResults.collections.length +
    localResults.locations.length +
    localResults.settingsSections.length;
  useEffect(() => {
    if (!searchesCards || !cards.isSuccess || debouncedQuery !== query) return;
    AccessibilityInfo.announceForAccessibility(t("search.resultsCount", { count: resultCount }));
  }, [searchesCards, cards.isSuccess, cards.dataUpdatedAt, debouncedQuery, query, resultCount, t]);
  const hasAnyResult =
    cardResults.length > 0 ||
    localResults.collections.length > 0 ||
    localResults.locations.length > 0 ||
    localResults.settingsSections.length > 0;

  return (
    <Screen
      refreshing={cards.isRefetching}
      onRefresh={() => {
        void locations.refetch();
        if (searchesCards) void cards.refetch();
      }}
      header={<PageHeader title={t("search.title")} onBack={() => router.back()} />}
    >
      <SearchInput
        value={search}
        onChangeText={setSearch}
        placeholder={t("search.placeholder")}
        accessibilityLabel={t("search.placeholder")}
      />

      {!query ? (
        <EmptyState icon="search" title={t("search.promptTitle")} description={t("search.promptDescription")} />
      ) : (
        <>
          {cards.isError ? <Callout tone="destructive" title={t("search.loadFailed")} /> : null}

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
                          result.collectionName,
                          result.setName ?? result.setCode?.toUpperCase(),
                          result.isFoil ? t("search.foil") : null,
                          placement,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                        leading={
                          <View
                            style={{
                              width: LIST_ROW_ICON_SIZE,
                              aspectRatio: CARD_ASPECT_RATIO,
                              borderRadius: CARD_THUMBNAIL_RADIUS,
                              overflow: "hidden",
                              backgroundColor: colors.muted,
                            }}
                          >
                            {imageUrl ? (
                              <Image source={{ uri: imageUrl }} accessible={false} style={{ flex: 1 }} contentFit="cover" />
                            ) : null}
                          </View>
                        }
                        onPress={() =>
                          router.push({
                            pathname: "/card/[scanId]",
                            params: { scanId: result.scanId, guid: result.collectionGuid },
                          })
                        }
                      />
                    );
                  })}
                </ListGroup>
              )}
            </View>
          ) : null}

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

          {!hasAnyResult && !isSearchingCards && !isWaitingForDebounce && !cards.isError ? (
            <EmptyState icon="search" title={t("search.emptyTitle")} description={t("search.emptyDescription")} />
          ) : null}
        </>
      )}
    </Screen>
  );
}
