import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo } from "react-native";
import { EMPTY_CARD_FILTERS, ORG_PROFILE_SHOWCASE_CARDS_MAX, type GroupedScannedCard } from "@magic-vault/shared";
import { CardRow } from "@/components/cards/card-row";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Screen } from "@/components/ui/screen";
import { SearchInput } from "@/components/ui/search-input";
import { SelectField } from "@/components/ui/select-field";
import { collectionCardsQueryOptions } from "@/features/collections/api/collection-cards";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { useShowcasePick } from "@/features/org-profile/api/use-showcase-pick";
import { toggleShowcaseCard } from "@/features/org-profile/lib/showcase-pick";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useActiveOrgId } from "@/hooks/use-org";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/collections";

export default function ProfileShowcasePickerScreen() {
  const { t } = useTranslation();
  const pick = useShowcasePick();
  const collections = useQuery(collectionsQueryOptions(useActiveOrgId()));
  const [collectionGuid, setCollectionGuid] = useState<string | null>(null);
  const [pickingCollection, setPickingCollection] = useState(false);
  const collection =
    collections.data?.find((candidate) => candidate.guid === collectionGuid) ?? collections.data?.[0] ?? null;
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
  const isFull = pick.scanIds.length >= ORG_PROFILE_SHOWCASE_CARDS_MAX;
  const pickedScanIdOf = (entry: GroupedScannedCard) =>
    [entry.scanId, ...entry.scanIds].find((scanId) => pick.scanIds.includes(scanId)) ?? null;

  const toggle = (entry: GroupedScannedCard) => {
    const pickedScanId = pickedScanIdOf(entry);
    if (!pickedScanId && isFull) {
      AccessibilityInfo.announceForAccessibility(
        t("settings.orgProfile.showcase.limitReached", { max: ORG_PROFILE_SHOWCASE_CARDS_MAX }),
      );
      return;
    }
    toggleShowcaseCard({
      scanId: pickedScanId ?? entry.scanId,
      name: entry.card.name,
      setCode: entry.card.set || null,
      imageUrl: entry.card.image?.normal ?? entry.card.image?.small ?? null,
    });
    AccessibilityInfo.announceForAccessibility(
      t(pickedScanId ? "settings.orgProfile.showcase.removed" : "settings.orgProfile.showcase.added", {
        name: entry.card.name,
      }),
    );
  };

  return (
    <Screen
      header={
        <PageHeader
          title={t("settings.orgProfile.showcase.pickerTitle")}
          subtitle={t("settings.orgProfile.showcase.count", {
            selected: pick.scanIds.length,
            max: ORG_PROFILE_SHOWCASE_CARDS_MAX,
          })}
          onBack={() => router.back()}
        />
      }
      footer={<Button size="lg" label={t("common.done")} onPress={() => router.back()} />}
    >
      {collections.isError && !collections.data ? (
        <QueryErrorState onRetry={() => void collections.refetch()} isRetrying={collections.isFetching} />
      ) : collections.isLoading ? (
        <ListSkeleton rows={5} leading="thumbnail" hasSubtitle hasTrailing={false} />
      ) : !collection ? (
        <EmptyState icon="collections" title={t("settings.orgProfile.showcase.noCollections")} />
      ) : (
        <>
          <SelectField
            label={t("settings.orgProfile.showcase.collectionLabel")}
            value={collection.name}
            placeholder={t("settings.orgProfile.showcase.collectionLabel")}
            onPress={() => setPickingCollection(true)}
          />
          <SearchInput
            value={search}
            onChangeText={setSearch}
            placeholder={t("settings.orgProfile.showcase.search")}
            accessibilityLabel={t("settings.orgProfile.showcase.search")}
          />
          {isFull ? (
            <Callout
              tone="info"
              title={t("settings.orgProfile.showcase.limitReached", { max: ORG_PROFILE_SHOWCASE_CARDS_MAX })}
            />
          ) : null}
          {cards.isLoading ? (
            <ListSkeleton rows={5} leading="thumbnail" hasSubtitle hasTrailing={false} />
          ) : cards.isError && entries.length === 0 ? (
            <QueryErrorState
              title={t("settings.orgProfile.showcase.cardsLoadFailed")}
              onRetry={() => void cards.refetch()}
              isRetrying={cards.isFetching}
            />
          ) : entries.length === 0 ? (
            <EmptyState icon="search" title={t("settings.orgProfile.showcase.noCards")} />
          ) : (
            <ListGroup>
              {entries.map((entry) => (
                <CardRow
                  key={entry.scanId}
                  name={entry.card.name}
                  subtitle={[entry.card.setName, entry.card.set?.toUpperCase()].filter(Boolean).join(" · ")}
                  imageUrl={entry.card.image?.small ?? entry.card.image?.normal ?? null}
                  quantity={entry.quantity}
                  checked={pickedScanIdOf(entry) !== null}
                  onPress={() => toggle(entry)}
                />
              ))}
            </ListGroup>
          )}
          {cards.hasNextPage ? (
            <Button
              variant="secondary"
              label={t("settings.orgProfile.showcase.loadMore")}
              loading={cards.isFetchingNextPage}
              onPress={() => void cards.fetchNextPage()}
            />
          ) : null}
        </>
      )}
      <OptionSheet
        visible={pickingCollection}
        title={t("settings.orgProfile.showcase.collectionLabel")}
        options={(collections.data ?? []).map((candidate) => ({
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
