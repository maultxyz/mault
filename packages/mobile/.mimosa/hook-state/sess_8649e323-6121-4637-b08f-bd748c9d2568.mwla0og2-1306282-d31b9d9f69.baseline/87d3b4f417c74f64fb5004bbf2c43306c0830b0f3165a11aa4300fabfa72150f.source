import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { parseShareLinkUrl, parseStorageLabelUrl } from "@magic-vault/shared";
import { router, useLocalSearchParams } from "expo-router";
import { Linking } from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Screen } from "@/components/ui/screen";
import { SearchInput } from "@/components/ui/search-input";
import { shortLinkQueryOptions } from "@/features/share-links/api/short-links";
import { useOpenStorageLabel } from "@/features/storage/api/use-open-storage-label";
import { tradeLinkCardsQueryOptions, tradeLinkInfoQueryOptions } from "@/features/trade-offers/api/public-trade";
import { TradeCardRow } from "@/features/trade-offers/components/trade-card-row";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/collections";
import { WEB_URL } from "@/lib/constants/config";
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
  const cards = useInfiniteQuery({
    ...tradeLinkCardsQueryOptions(link ?? placeholderLink, debouncedSearch),
    enabled: !!link && isViewLink,
  });
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
    />
  );

  if (params.shortCode && (shortLink.isLoading || shortLinkTarget)) {
    return (
      <Screen header={header}>
        <PageSkeleton />
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
    </Screen>
  );
}
