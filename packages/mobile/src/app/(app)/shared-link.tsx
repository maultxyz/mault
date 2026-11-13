import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Screen } from "@/components/ui/screen";
import { SearchInput } from "@/components/ui/search-input";
import { tradeLinkCardsQueryOptions, tradeLinkInfoQueryOptions } from "@/features/trade-offers/api/public-trade";
import { TradeCardRow } from "@/features/trade-offers/components/trade-card-row";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/collections";
import type { TradeLinkRef } from "@/lib/interfaces/trade";

export default function SharedLinkScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ kind?: string; guid?: string; token?: string }>();
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
  const cards = useInfiniteQuery({
    ...tradeLinkCardsQueryOptions(link ?? placeholderLink, debouncedSearch),
    enabled: !!link && isViewLink,
  });
  const entries = cards.data?.pages.flatMap((page) => page.cards) ?? [];
  const total = cards.data?.pages[0]?.total;

  useEffect(() => {
    if (link && info.data?.purpose === "trade") router.replace({ pathname: "/trade", params: { ...link } });
  }, [link, info.data?.purpose]);

  const header = (
    <PageHeader
      title={info.data?.name ?? t("sharedLink.title")}
      subtitle={
        link?.kind === "storage"
          ? t("sharedLink.storageSubtitle", { count: total ?? 0 })
          : t("sharedLink.collectionSubtitle", { count: total ?? 0 })
      }
      onBack={() => router.back()}
    />
  );

  if (!link || info.isError) {
    return (
      <Screen header={header}>
        <EmptyState icon="share" title={t("sharedLink.invalid")} description={t("sharedLink.invalidDescription")} />
      </Screen>
    );
  }
  if (info.isLoading || !isViewLink) {
    return (
      <Screen header={header}>
        <PageSkeleton />
      </Screen>
    );
  }

  return (
    <Screen header={header}>
      <SearchInput
        value={search}
        onChangeText={setSearch}
        placeholder={t("sharedLink.search")}
        accessibilityLabel={t("sharedLink.search")}
      />
      {cards.isLoading ? (
        <ListSkeleton />
      ) : cards.isError ? (
        <EmptyState icon="share" title={t("sharedLink.loadFailed")} />
      ) : entries.length === 0 ? (
        <EmptyState icon="search" title={t("sharedLink.empty")} />
      ) : (
        entries.map((card) => (
          <TradeCardRow
            key={card.scanId}
            name={card.card.name}
            subtitle={[card.card.setName, card.condition, card.isFoil ? (card.foilType ?? t("trade.foil")) : null]
              .filter(Boolean)
              .join(" · ")}
            imageUrl={card.card.image?.small ?? card.card.image?.normal ?? null}
          />
        ))
      )}
      {cards.hasNextPage ? (
        <Button
          variant="secondary"
          label={t("sharedLink.loadMore")}
          loading={cards.isFetchingNextPage}
          onPress={() => void cards.fetchNextPage()}
        />
      ) : null}
    </Screen>
  );
}
