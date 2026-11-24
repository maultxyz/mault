import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import { CardThumbnail } from "@/components/cards/card-thumbnail";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Pill } from "@/components/ui/pill";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { SectionSkeleton } from "@/components/ui/section-skeleton";
import { StatGroup } from "@/components/ui/stat-group";
import { StatTile } from "@/components/ui/stat-tile";
import {
  buyPerformanceQueryOptions,
  cancelIntakeLot,
  deleteIntakeLot,
  intakeLotCardsQueryOptions,
  intakeLotQueryOptions,
} from "@/features/business/api/business";
import { businessAccessQueryOptions } from "@/features/business/api/business-access";
import { BusinessDetailSkeleton } from "@/features/business/components/business-detail-skeleton";
import { BusinessTipsButton } from "@/features/business/components/business-tips-button";
import { BusinessTipsSheet } from "@/features/business/components/business-tips-sheet";
import { useBusinessTips } from "@/features/business/lib/use-business-tips";
import { useBusinessAction } from "@/features/business/api/use-business-action";
import { BuyPerformanceSection } from "@/features/business/components/buy-performance-section";
import { useScanTarget } from "@/features/collections/api/use-scan-target";
import { useCompactCount } from "@/hooks/use-compact-count";
import { useActiveOrgId } from "@/hooks/use-org";
import { usePricing } from "@/hooks/use-pricing";
import { ApiResultError } from "@/lib/api/api-result-error";
import { cardThumbnailUrl } from "@/lib/card-art";
import { BUSINESS_STATUS_TONES, BUY_SOURCE_ICONS } from "@/lib/constants/business";
import { SPACING } from "@/lib/constants/theme";
import type { IntakeLotCardRowProps } from "@/lib/interfaces/business";

function IntakeLotCardRow({ card, onPress }: IntakeLotCardRowProps) {
  const { t } = useTranslation();
  const { format } = usePricing();
  const imageUrl = cardThumbnailUrl(card.card.image);
  const printing = [
    card.card.setName || card.card.set.toUpperCase(),
    card.card.collectorNumber ? `#${card.card.collectorNumber}` : null,
    card.condition,
    card.isFoil ? t("business.picks.walk.foil") : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const amount = card.offer ?? card.acquisitionCost;
  return (
    <ListRow
      leading={<CardThumbnail imageUrl={imageUrl} />}
      title={card.card.name}
      subtitle={card.belowMinimum ? `${printing}\n${t("business.intake.belowMinimumRow")}` : printing}
      subtitleNumberOfLines={2}
      value={amount != null ? format(amount) : undefined}
      onPress={onPress}
    />
  );
}

export default function IntakeLotScreen() {
  const { guid } = useLocalSearchParams<{ guid: string }>();
  const { t, i18n } = useTranslation();
  const compactCount = useCompactCount();
  const orgId = useActiveOrgId();
  const { format } = usePricing();
  const { run: runAction, refresh } = useBusinessAction();
  const { setScanTargetGuid } = useScanTarget();
  const [menuOpen, setMenuOpen] = useState(false);
  const lotQuery = useQuery(intakeLotQueryOptions(guid));
  const lot = lotQuery.data;
  const isOpen = lot?.status === "open";
  const isOpenedProduct = lot?.sourceType === "opened";
  const cards = useInfiniteQuery(intakeLotCardsQueryOptions(guid, isOpen));
  const access = useQuery(businessAccessQueryOptions(orgId));
  const tips = useBusinessTips("buys", !!access.data && !access.data.isLocked);
  const canAccept = !!access.data?.canAcceptIntake;
  const showMoney = !!access.data?.canViewCosts;
  const cardItems = cards.data?.pages.flatMap((page) => page.items) ?? [];
  const canTransfer = lot?.status === "accepted" && lot.ownsCollection && !lot.collectionDeleted && canAccept;
  const performance = useQuery(buyPerformanceQueryOptions(guid, showMoney && lot?.status === "accepted"));

  const confirmCancel = () => {
    if (!lot) return;
    Alert.alert(t("business.intake.cancelTitle"), t("business.intake.cancelDescription", { name: lot.customerName }), [
      { text: t("business.back"), style: "cancel" },
      {
        text: t("business.intake.cancelKeepCards"),
        onPress: () => void runAction(() => cancelIntakeLot(lot.guid, { removeCards: false }), t("business.intake.cancelled")),
      },
      {
        text: t("business.intake.cancelRemoveCards", { count: lot.cardCount }),
        style: "destructive",
        onPress: () => void runAction(() => cancelIntakeLot(lot.guid, { removeCards: true }), t("business.intake.cancelled")),
      },
    ]);
  };

  const confirmDelete = () => {
    if (!lot) return;
    Alert.alert(t("business.intake.deleteTitle"), t("business.intake.deleteDescription"), [
      { text: t("business.back"), style: "cancel" },
      {
        text: t("business.delete"),
        style: "destructive",
        onPress: () => void runAction(() => deleteIntakeLot(lot.guid), t("business.intake.deleted"), () => router.back()),
      },
    ]);
  };

  const menuOptions = [
    ...(isOpen && canAccept ? [{ value: "cancel", label: t("business.intake.cancelLot") }] : []),
    ...(!isOpen && canAccept ? [{ value: "delete", label: t("business.delete") }] : []),
    ...(lot && !lot.collectionDeleted ? [{ value: "collection", label: t("business.intake.openCollection") }] : []),
  ];
  const chooseMenuAction = (action: string) => {
    setMenuOpen(false);
    if (action === "cancel") confirmCancel();
    if (action === "delete") confirmDelete();
    if (action === "collection" && lot) router.push({ pathname: "/collection/[guid]", params: { guid: lot.collectionGuid } });
  };

  const scanIntoLot = () => {
    if (!lot) return;
    setScanTargetGuid(lot.collectionGuid);
    router.navigate("/scan");
  };

  return (
    <Screen
      onRefresh={refresh}
      header={
        <PageHeader
          title={lot?.customerName ?? t("business.intake.title")}
          subtitle={
            lot
              ? t("business.intake.subtitle", {
                  collection: lot.collectionName,
                  date: new Date(lot.createdAt).toLocaleDateString(i18n.language, { dateStyle: "medium" }),
                })
              : null
          }
          onBack={() => router.back()}
          actions={
            <>
              <BusinessTipsButton onPress={tips.open} />
              {menuOptions.length > 0 ? (
                <IconButton icon="more" accessibilityLabel={t("business.intake.moreActions")} onPress={() => setMenuOpen(true)} />
              ) : null}
            </>
          }
        />
      }
    >
      {lotQuery.isPending ? (
        <BusinessDetailSkeleton pillCount={2} statTileCount={2} hasStatHeading>
          <ListSkeleton rows={2} hasSubtitle hasTrailing={false} />
          <SectionSkeleton>
            <ListSkeleton rows={3} leading="thumbnail" hasSubtitle />
          </SectionSkeleton>
        </BusinessDetailSkeleton>
      ) : !lot && !(lotQuery.error instanceof ApiResultError) ? (
        <QueryErrorState onRetry={() => void lotQuery.refetch()} isRetrying={lotQuery.isFetching} />
      ) : !lot ? (
        <EmptyState
          icon="coins"
          title={t("business.intake.notFound")}
          action={<Button variant="secondary" label={t("recovery.retry")} onPress={() => void lotQuery.refetch()} />}
        />
      ) : (
        <>
          <View style={{ flexDirection: "row", gap: SPACING.sm }}>
            <Pill label={t(`business.status.${lot.status}`)} tone={BUSINESS_STATUS_TONES[lot.status]} />
            <Pill label={t(`business.buy.sourceTypes.${lot.sourceType}`)} />
            {lot.payoutMethod ? <Pill label={t(`business.intake.payout.${lot.payoutMethod}`)} /> : null}
          </View>
          {lot.collectionDeleted ? <Callout tone="warning" title={t("business.intake.collectionDeleted")} /> : null}
          <StatGroup heading={isOpen && !isOpenedProduct ? t("business.intake.liveOffer") : t("business.intake.summary")}>
            <StatTile label={t("business.intake.stats.cards")} {...compactCount(lot.cardCount)} />
            {showMoney && lot.marketTotal != null ? (
              <StatTile label={t("business.intake.stats.market")} value={format(lot.marketTotal)} />
            ) : null}
            {showMoney && lot.status === "accepted" && lot.paidTotal != null ? (
              <StatTile
                label={t(isOpenedProduct ? "business.intake.stats.cost" : "business.intake.stats.paid")}
                value={format(lot.paidTotal)}
              />
            ) : null}
            {showMoney && !isOpenedProduct && lot.status !== "accepted" && lot.cashOffer != null ? (
              <StatTile label={t("business.intake.stats.cash")} value={format(lot.cashOffer)} />
            ) : null}
            {showMoney && !isOpenedProduct && lot.status !== "accepted" && lot.creditOffer != null ? (
              <StatTile label={t("business.intake.stats.credit")} value={format(lot.creditOffer)} />
            ) : null}
          </StatGroup>
          {isOpen && !isOpenedProduct && lot.belowMinimumScanIds.length > 0 ? (
            <Callout tone="info" title={t("business.intake.belowMinimum", { count: lot.belowMinimumScanIds.length })} />
          ) : null}
          {isOpen && !lot.collectionDeleted ? (
            <View style={{ gap: SPACING.sm }}>
              <Button size="lg" icon="scan" label={t("business.intake.scanCards")} onPress={scanIntoLot} />
              {canAccept ? (
                <Button
                  size="lg"
                  variant="secondary"
                  icon="check"
                  label={t("business.buy.finish")}
                  disabled={lot.cardCount === 0}
                  onPress={() => router.push({ pathname: "/business/intake-accept", params: { guid: lot.guid } })}
                />
              ) : null}
            </View>
          ) : null}
          {canTransfer ? (
            <Button
              size="lg"
              icon="transfer"
              label={t("business.intake.transfer")}
              onPress={() => router.push({ pathname: "/business/intake-transfer", params: { guid: lot.guid } })}
            />
          ) : null}
          {performance.data ? <BuyPerformanceSection buyGuid={lot.guid} performance={performance.data} /> : null}
          {performance.isError && !performance.data ? (
            <QueryErrorState
              title={t("business.buy.performance.loadFailed")}
              onRetry={() => void performance.refetch()}
              isRetrying={performance.isFetching}
            />
          ) : null}
          <ListGroup>
            <ListRow
              icon={BUY_SOURCE_ICONS[lot.sourceType]}
              title={t(`business.buy.nameLabel.${lot.sourceType}`)}
              value={lot.customerName}
            />
            <ListRow
              icon="storage"
              title={t("business.buy.destination")}
              subtitle={
                lot.destinationLocationName
                  ? t("business.buy.destinationWithLocation", {
                      collection: lot.collectionName,
                      location: lot.destinationLocationName,
                    })
                  : lot.collectionName
              }
              subtitleNumberOfLines={2}
            />
          </ListGroup>
          {lot.customerContact || lot.notes ? (
            <ListGroup>
              {lot.customerContact ? <ListRow title={t("business.intake.contact")} value={lot.customerContact} /> : null}
              {lot.notes ? (
                <ListRow title={t("business.intake.notesTitle")} subtitle={lot.notes} subtitleNumberOfLines={6} />
              ) : null}
            </ListGroup>
          ) : null}
          <View style={{ gap: SPACING.sm }}>
            <SectionHeader title={t("business.intake.cardsSection", { count: lot.cardCount })} />
            {cards.isError && !cards.data ? (
              <QueryErrorState
                title={t("recovery.cardsLoadFailed")}
                onRetry={() => void cards.refetch()}
                isRetrying={cards.isFetching}
              />
            ) : cards.isPending ? (
              <ListSkeleton rows={3} leading="thumbnail" hasSubtitle />
            ) : cardItems.length === 0 ? (
              <AppText size="sm" tone="secondary">
                {isOpen ? t("business.intake.noCardsOpen") : t("business.intake.noCardsClosed")}
              </AppText>
            ) : (
              <ListGroup>
                {cardItems.map((card) => (
                  <IntakeLotCardRow
                    key={card.scanId}
                    card={
                      !showMoney
                        ? { ...card, offer: null, acquisitionCost: null }
                        : isOpenedProduct
                          ? { ...card, offer: null, belowMinimum: false }
                          : card
                    }
                    onPress={() =>
                      router.push({ pathname: "/card/[scanId]", params: { scanId: card.scanId, guid: lot.collectionGuid } })
                    }
                  />
                ))}
              </ListGroup>
            )}
            {cards.hasNextPage ? (
              <Button
                variant="secondary"
                label={t("business.showMore")}
                loading={cards.isFetchingNextPage}
                onPress={() => void cards.fetchNextPage()}
              />
            ) : null}
          </View>
        </>
      )}
      <OptionSheet
        visible={menuOpen}
        title={lot?.customerName ?? t("business.intake.title")}
        options={menuOptions}
        selected={[]}
        onSelect={chooseMenuAction}
        onClose={() => setMenuOpen(false)}
      />
      <BusinessTipsSheet topic="buys" visible={tips.isOpen} onClose={tips.close} />
    </Screen>
  );
}
