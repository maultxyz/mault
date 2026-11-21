import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo } from "react-native";
import { EMPTY_CARD_FILTERS } from "@magic-vault/shared";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { ListGroup } from "@/components/ui/list-group";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { SearchInput } from "@/components/ui/search-input";
import { SelectField } from "@/components/ui/select-field";
import { collectionCardsQueryOptions } from "@/features/collections/api/collection-cards";
import { useScanTarget } from "@/features/collections/api/use-scan-target";
import { useTradeDraft } from "@/features/trade-offers/api/use-trade-draft";
import { TradeCardRow } from "@/features/trade-offers/components/trade-card-row";
import { toOfferedTradeCard } from "@/features/trade-offers/lib/offered-card";
import { addOfferedCard } from "@/features/trade-offers/lib/trade-draft";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useTheme } from "@/hooks/use-theme";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/collections";

export default function TradeCollectionScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const draft = useTradeDraft();
  const scanTarget = useScanTarget();
  const [collectionGuid, setCollectionGuid] = useState<string | null>(null);
  const [pickingCollection, setPickingCollection] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const collection =
    scanTarget.collections.find((candidate) => candidate.guid === collectionGuid) ?? scanTarget.collection;
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim().toLowerCase(), SEARCH_DEBOUNCE_MS);
  const cards = useInfiniteQuery({
    ...collectionCardsQueryOptions(collection?.guid ?? "", {
      search: debouncedSearch,
      sort: null,
      filters: EMPTY_CARD_FILTERS,
      grouped: true,
    }),
    enabled: !!collection,
  });
  const entries = cards.data?.pages.flatMap((page) => page.items) ?? [];
  const offeredCount = draft.offered.reduce((sum, card) => sum + card.quantity, 0);

  return (
    <Screen
      header={
        <PageHeader
          title={t("trade.fromCollectionTitle")}
          subtitle={t("trade.givingCount", { count: offeredCount })}
          onBack={() => router.back()}
        />
      }
    >
      <SelectField
        label={t("trade.collectionLabel")}
        value={collection?.name ?? null}
        placeholder={t("trade.pickCollection")}
        onPress={() => setPickingCollection(true)}
      />
      <SearchInput
        value={search}
        onChangeText={setSearch}
        placeholder={t("trade.searchCollection")}
        accessibilityLabel={t("trade.searchCollection")}
      />
      {lastAdded ? <Callout tone="success" title={t("trade.added", { name: lastAdded })} /> : null}
      {!collection ? (
        <EmptyState icon="collections" title={t("trade.noCollections")} />
      ) : cards.isLoading ? (
        <ListSkeleton />
      ) : cards.isError && entries.length === 0 ? (
        <Callout
          tone="destructive"
          title={t("trade.collectionCardsLoadFailed")}
          action={<Button size="sm" variant="secondary" label={t("recovery.retry")} onPress={() => void cards.refetch()} />}
        />
      ) : entries.length === 0 ? (
        <EmptyState icon="search" title={t("trade.noCollectionCards")} />
      ) : (
        <ListGroup>
          {entries.map((entry) => (
            <TradeCardRow
              key={entry.scanId}
              name={entry.card.name}
              subtitle={[
                entry.quantity > 1 ? `×${entry.quantity}` : null,
                entry.card.setName,
                t(`trade.conditions.${entry.condition}`),
                entry.isFoil ? (entry.foilType ?? t("trade.foil")) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              imageUrl={entry.card.image?.small ?? entry.card.image?.normal ?? null}
              accessibilityHint={t("trade.tapToAdd")}
              right={<Icon name="plus" size={16} color={colors.foregroundSecondary} />}
              onPress={() => {
                const offered = toOfferedTradeCard(entry.card, collection, entry);
                if (!offered) return;
                addOfferedCard(offered);
                setLastAdded(entry.card.name);
                AccessibilityInfo.announceForAccessibility(t("trade.added", { name: entry.card.name }));
              }}
            />
          ))}
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
      <Button size="lg" label={t("trade.done")} onPress={() => router.back()} />
      <OptionSheet
        visible={pickingCollection}
        title={t("trade.collectionLabel")}
        options={scanTarget.collections.map((candidate) => ({
          value: candidate.guid,
          label: candidate.name,
          badge: candidate.game?.name,
        }))}
        selected={collection ? [collection.guid] : []}
        onSelect={(guid) => {
          setCollectionGuid(guid);
          setPickingCollection(false);
        }}
        onClose={() => setPickingCollection(false)}
      />
    </Screen>
  );
}
