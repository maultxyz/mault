import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { useToast } from "@/components/ui/toast-provider";
import { useAddCatalogCard } from "@/features/cards/api/add-catalog-card";
import { CardDetailArt } from "@/features/cards/components/card-detail-art";
import { CardDetailInfoSections } from "@/features/cards/components/card-detail-info-sections";
import { CardDetailSkeleton } from "@/features/cards/components/card-detail-skeleton";
import { CardDetailTitleBlock } from "@/features/cards/components/card-detail-title-block";
import { useScanTarget } from "@/features/collections/api/use-scan-target";
import { catalogCardQueryOptions, rememberCatalogCard } from "@/features/search/api/catalog-card-search";
import { CardPrintingsGrid } from "@/features/search/components/card-printings-grid";
import { usePricing } from "@/hooks/use-pricing";
import { useTheme } from "@/hooks/use-theme";
import { SPACING } from "@/lib/constants/theme";
import type { CatalogCardRouteParams } from "@/lib/interfaces/search";
import { catalogGamesOf, type PlayingCard } from "@magic-vault/shared";

export default function CatalogCardScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { id, gameKey } = useLocalSearchParams<CatalogCardRouteParams>();
  const { collections, collection: scanTargetCollection, collectionsQuery } = useScanTarget();
  const pricing = usePricing();
  const { showToast } = useToast();
  const addCard = useAddCatalogCard();
  const [pickerOpen, setPickerOpen] = useState(false);
  const queryClient = useQueryClient();
  const [selectedCardId, setSelectedCardId] = useState(id);
  const game = catalogGamesOf(collections, scanTargetCollection?.guid).find((entry) => entry.gameKey === gameKey) ?? null;
  const cardQuery = useQuery({ ...catalogCardQueryOptions(game, selectedCardId), placeholderData: keepPreviousData });
  const card = cardQuery.data;
  const targets = collections.filter((collection) => collection.game?.key === gameKey);
  const defaultTarget = targets.find((collection) => collection.guid === scanTargetCollection?.guid) ?? targets[0] ?? null;
  const hasFailed = cardQuery.isError || (!cardQuery.isPending && !card) || (!game && !collectionsQuery.isPending);

  const selectPrinting = (printing: PlayingCard) => {
    rememberCatalogCard(queryClient, gameKey, printing);
    setSelectedCardId(printing.id);
  };

  const add = (collectionGuid: string) => {
    if (!card) return;
    const target = targets.find((collection) => collection.guid === collectionGuid);
    if (!target) return;
    addCard.mutate(
      { collectionGuid, card },
      {
        onSuccess: () =>
          showToast({
            message: t("catalogCard.added", { name: card.name, collection: target.name }),
            tone: "success",
            action: {
              label: t("catalogCard.view"),
              onPress: () => router.push({ pathname: "/collection/[guid]", params: { guid: target.guid } }),
            },
          }),
        onError: () =>
          showToast({
            message: t("catalogCard.addFailed"),
            tone: "destructive",
            action: { label: t("recovery.retry"), onPress: () => add(collectionGuid) },
          }),
      },
    );
  };

  const bottomActions =
    card && targets.length > 0 ? (
      <Button
        style={{ flex: 1 }}
        icon="plus"
        label={
          targets.length === 1 && defaultTarget
            ? t("catalogCard.addTo", { collection: defaultTarget.name })
            : t("catalogCard.add")
        }
        loading={addCard.isPending}
        disabled={cardQuery.isPlaceholderData}
        onPress={() => {
          if (targets.length === 1 && defaultTarget) add(defaultTarget.guid);
          else setPickerOpen(true);
        }}
      />
    ) : null;

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader title={t("catalogCard.title")} onBack={() => router.back()} />
      <PinnedActionsLayout actions={bottomActions} actionsDirection="row">
        {hasFailed ? (
          <Callout
            tone="destructive"
            title={t("catalogCard.loadFailed")}
            action={
              <Button
                size="sm"
                variant="secondary"
                label={t("recovery.retry")}
                loading={cardQuery.isFetching}
                onPress={() => void cardQuery.refetch()}
              />
            }
          />
        ) : !card ? (
          <CardDetailSkeleton showsCapturedScan={false} showsAttributePills={false} />
        ) : (
          <>
            {targets.length === 0 && !collectionsQuery.isPending ? (
              <Callout tone="info" title={t("catalogCard.noCollection", { game: game?.gameName ?? "" })} />
            ) : null}
            <CardDetailTitleBlock
              name={card.name}
              subtitle={card.typeLine}
              price={pricing.priceOf(card, { isFoil: false, foilType: null, stamp: null })}
            />
            <View style={{ flexDirection: "row", gap: SPACING.md, alignItems: "flex-start" }}>
              <CardDetailArt card={card} />
            </View>
            <CardDetailInfoSections card={card} isFoil={false} foilType={null} stamp={null} />
            <CardPrintingsGrid
              game={game}
              openedCardId={id}
              selectedCardId={selectedCardId}
              onSelect={selectPrinting}
            />
          </>
        )}
      </PinnedActionsLayout>

      <OptionSheet
        visible={pickerOpen}
        title={t("catalogCard.chooseCollection")}
        options={targets.map((collection) => ({ value: collection.guid, label: collection.name }))}
        selected={defaultTarget ? [defaultTarget.guid] : []}
        onSelect={(collectionGuid) => {
          setPickerOpen(false);
          add(collectionGuid);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}
