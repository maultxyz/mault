import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  DEFAULT_PUBLIC_CARD_SORT,
  EMPTY_PUBLIC_CARD_FILTERS,
  parseShareLinkUrl,
  parseStorageLabelUrl,
  type PublicCardFilters,
  type PublicCardSort,
} from "@magic-vault/shared";
import { router, useLocalSearchParams } from "expo-router";
import { Linking } from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Screen } from "@/components/ui/screen";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { shortLinkQueryOptions } from "@/features/share-links/api/short-links";
import { useOpenStorageLabel } from "@/features/storage/api/use-open-storage-label";
import {
  tradeLinkCardsQueryOptions,
  tradeLinkFacetsQueryOptions,
  tradeLinkInfoQueryOptions,
} from "@/features/trade-offers/api/public-trade";
import { IconButton } from "@/components/ui/icon-button";
import { SharedLinkFilterSheet } from "@/features/share-links/components/shared-link-filter-sheet";
import { TradeCardRow } from "@/features/trade-offers/components/trade-card-row";
import { isInvalidLinkError } from "@/features/trade-offers/lib/link-errors";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/collections";
import { WEB_URL } from "@/lib/constants/config";
import { CONTROL_RADIUS } from "@/lib/constants/theme";
import { SEARCH_INPUT_HEIGHT } from "@/lib/constants/ui";
import type { TradeLinkRef } from "@/lib/interfaces/trade";

export default function SharedLinkScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ kind?: string; guid?: string; token?: string; shortCode?: string }>();
  const shortLink = useQuery(shortLinkQueryOptions(params.shortCode ?? ""));
  const shortLinkTarget = shortLink.data;
  const resolvedShareLink = useMemo(
    () => (shortLinkTarget ? parseShareLinkUrl(`${WEB_URL}${shortLinkTarget.path}`) : null),
    [shortLinkTarget],
  );
  const resolvedStorageLabel = useMemo(
    () => (shortLinkTarget ? parseStorageLabelUrl(`${WEB_URL}${shortLinkTarget.path}`) : null),
    [shortLinkTarget],
  );
  const openStorageLabel = useOpenStorageLabel();
  const hasOpenedResolvedTargetRef = useRef(false);
  const link = useMemo<TradeLinkRef | null>(
    () =>
      (params.kind === "collection" || params.kind === "storage") && params.guid && params.token
        ? { kind: params.kind, guid: params.guid, token: params.token }
        : null,
    [params.kind, params.guid, params.token],
  );
  const placeholderLink: TradeLinkRef = { kind: "collection", guid: "", token: "" };
  const info = useQuery({ ...tradeLinkInfoQueryOptions(link ?? placeholderLink), enabled: !!link });
  const isViewLink = !!info.data && info.data.purpose !== "trade";
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const [sort, setSort] = useState<PublicCardSort>(DEFAULT_PUBLIC_CARD_SORT);
  const [filters, setFilters] = useState<PublicCardFilters>(EMPTY_PUBLIC_CARD_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const cards = useInfiniteQuery({
    ...tradeLinkCardsQueryOptions(link ?? placeholderLink, debouncedSearch, { sort, filters }),
    enabled: !!link && isViewLink,
  });
  const facets = useQuery({ ...tradeLinkFacetsQueryOptions(link ?? placeholderLink), enabled: !!link && isViewLink && filtersOpen });
  const entries = cards.data?.pages.flatMap((page) => page.cards) ?? [];
  const total = cards.data?.pages[0]?.total;

  useEffect(() => {
    if (link && info.data?.purpose === "trade") router.replace({ pathname: "/trade", params: { ...link } });
  }, [link, info.data?.purpose]);

  useEffect(() => {
    if (resolvedShareLink) {
      router.replace({ pathname: "/shared-link", params: { ...resolvedShareLink } });
    } else if (resolvedStorageLabel) {
      if (hasOpenedResolvedTargetRef.current) return;
      hasOpenedResolvedTargetRef.current = true;
      openStorageLabel(resolvedStorageLabel, { replacesCurrentScreen: true });
    } else if (shortLinkTarget) {
      void Linking.openURL(`${WEB_URL}${shortLinkTarget.path}`);
      router.back();
    }
  }, [resolvedShareLink, resolvedStorageLabel, openStorageLabel, shortLinkTarget]);

  const header = (
    <PageHeader
      title={info.data?.name ?? t("sharedLink.title")}
      subtitle={
        link?.kind === "storage"
          ? t("sharedLink.storageSubtitle", { count: total ?? 0 })
          : t("sharedLink.collectionSubtitle", { count: total ?? 0 })
      }
      onBack={() => router.back()}
      actions={
        isViewLink ? (
          <IconButton icon="filter" accessibilityLabel={t("sharedLink.filters.title")} onPress={() => setFiltersOpen(true)} />
        ) : null
      }
    />
  );

  const loadingCards = <ListSkeleton rows={5} leading="thumbnail" hasSubtitle hasTrailing={false} />;
  const loadingScreen = (
    <Screen header={header}>
      <Skeleton height={SEARCH_INPUT_HEIGHT} radius={CONTROL_RADIUS} />
      {loadingCards}
    </Screen>
  );

  if (params.shortCode && (shortLink.isLoading || shortLinkTarget)) {
    return loadingScreen;
  }
  if (params.shortCode && shortLink.isError) {
    return (
      <Screen header={header} onRefresh={() => shortLink.refetch()}>
        <QueryErrorState
          title={t("sharedLink.linkLoadFailed")}
          onRetry={() => void shortLink.refetch()}
          isRetrying={shortLink.isFetching}
        />
      </Screen>
    );
  }
  if (link && info.isError && !isInvalidLinkError(info.error)) {
    return (
      <Screen header={header} onRefresh={() => info.refetch()}>
        <QueryErrorState
          title={t("sharedLink.linkLoadFailed")}
          onRetry={() => void info.refetch()}
          isRetrying={info.isFetching}
        />
      </Screen>
    );
  }
  if (!link || info.isError) {
    return (
      <Screen header={header}>
        <EmptyState icon="share" title={t("sharedLink.invalid")} description={t("sharedLink.invalidDescription")} />
      </Screen>
    );
  }
  if (info.isLoading || !isViewLink) {
    return loadingScreen;
  }

  return (
    <Screen header={header} onRefresh={() => Promise.all([info.refetch(), cards.refetch()])}>
      <SearchInput
        value={search}
        onChangeText={setSearch}
        placeholder={t("sharedLink.search")}
        accessibilityLabel={t("sharedLink.search")}
      />
      {cards.isLoading ? (
        loadingCards
      ) : cards.isError ? (
        <QueryErrorState
          title={t("sharedLink.loadFailed")}
          onRetry={() => void cards.refetch()}
          isRetrying={cards.isFetching}
        />
      ) : entries.length === 0 ? (
        <EmptyState icon="search" title={t("sharedLink.empty")} />
      ) : (
        <ListGroup>
          {entries.map((card) => (
            <TradeCardRow
              key={card.scanId}
              name={card.card.name}
              subtitle={[card.card.setName, card.condition, card.isFoil ? (card.foilType ?? t("trade.foil")) : null]
                .filter(Boolean)
                .join(" · ")}
              imageUrl={card.card.image?.small ?? card.card.image?.normal ?? null}
            />
          ))}
        </ListGroup>
      )}
      {cards.hasNextPage ? (
        <Button
          variant="secondary"
          label={t("sharedLink.loadMore")}
          loading={cards.isFetchingNextPage}
          onPress={() => void cards.fetchNextPage()}
        />
      ) : null}
      <SharedLinkFilterSheet
        visible={filtersOpen}
        facets={facets.data}
        showsPrices={!!info.data?.showsPrices}
        sort={sort}
        filters={filters}
        onSortChange={setSort}
        onFiltersChange={setFilters}
        onClose={() => setFiltersOpen(false)}
      />
    </Screen>
  );
}
