import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { SearchInput } from "@/components/ui/search-input";
import { tradeLinkCardsQueryOptions } from "@/features/trade-offers/api/public-trade";
import { useTradeDraft } from "@/features/trade-offers/api/use-trade-draft";
import { TradeCardRow } from "@/features/trade-offers/components/trade-card-row";
import { toggleWantedCard } from "@/features/trade-offers/lib/trade-draft";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/collections";

export default function TradeBrowseScreen() {
  const { t } = useTranslation();
  const draft = useTradeDraft();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const cards = useInfiniteQuery({
    ...tradeLinkCardsQueryOptions(draft.link ?? { kind: "collection", guid: "", token: "" }, debouncedSearch),
    enabled: !!draft.link,
  });
  const entries = cards.data?.pages.flatMap((page) => page.cards) ?? [];
  const wantedScanIds = new Set(draft.wanted.map((card) => card.scanId));

  return (
    <Screen
      header={
        <PageHeader
          title={t("trade.chooseCardsTitle")}
          subtitle={t("trade.selectedCount", { count: draft.wanted.length })}
          onBack={() => router.back()}
        />
      }
    >
      <SearchInput
        value={search}
        onChangeText={setSearch}
        placeholder={t("trade.searchLinkCards")}
        accessibilityLabel={t("trade.searchLinkCards")}
      />
      {cards.isLoading ? (
        <ListSkeleton />
      ) : cards.isError && entries.length === 0 ? (
        <Callout
          tone="destructive"
          title={t("trade.linkCardsLoadFailed")}
          action={<Button size="sm" variant="secondary" label={t("recovery.retry")} onPress={() => void cards.refetch()} />}
        />
      ) : entries.length === 0 ? (
        <EmptyState icon="search" title={t("trade.noLinkCards")} />
      ) : (
        <ListGroup>
          {entries.map((card) => {
            const isWanted = wantedScanIds.has(card.scanId);
            return (
              <TradeCardRow
                key={card.scanId}
                name={card.card.name}
                subtitle={[card.card.setName, t(`trade.conditions.${card.condition}`), card.isFoil ? (card.foilType ?? t("trade.foil")) : null]
                  .filter(Boolean)
                  .join(" · ")}
                imageUrl={card.card.image?.small ?? card.card.image?.normal ?? null}
                accessibilityHint={isWanted ? t("trade.tapToRemove") : t("trade.tapToAdd")}
                selected={isWanted}
                onPress={() => toggleWantedCard(card)}
              />
            );
          })}
        </ListGroup>
      )}
      {cards.hasNextPage ? (
        <Button
          variant="secondary"
          label={t("trade.loadMore")}
          loading={cards.isFetchingNextPage}
          onPress={() => void cards.fetchNextPage()}
        />
      ) : null}
      {draft.wanted.length > 0 ? (
        <Button size="lg" label={t("trade.done")} onPress={() => router.back()} />
      ) : (
        <AppText size="xs" tone="secondary" style={{ textAlign: "center" }}>
          {t("trade.chooseCardsHint")}
        </AppText>
      )}
    </Screen>
  );
}
