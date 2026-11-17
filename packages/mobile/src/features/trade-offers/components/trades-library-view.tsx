import {
  formatCompactPriceInCurrency,
  formatPrice,
  isTradeOfferBeingPicked,
  PRICE_SOURCE_FIELDS,
  type TradeOffer,
} from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { outgoingTradeOffersQueryOptions } from "@/features/trade-offers/api/outgoing-trade-offers";
import { tradeOffersQueryOptions } from "@/features/trade-offers/api/trade-offers";
import { NewTradeSheets } from "@/features/trade-offers/components/new-trade-sheets";
import { useActiveOrgId } from "@/hooks/use-org";
import { useSession } from "@/lib/auth/session";
import { SPACING } from "@/lib/constants/theme";
import {
  TRADE_OFFER_STATUS_TONES,
  TRADE_OFFERS_SKELETON_ROWS,
  TRADES_BOXES,
} from "@/lib/constants/trade-offers";
import type { LibraryViewProps } from "@/lib/interfaces/library";
import type { NewTradeSheet, TradeOfferLibrarySectionProps, TradesBox } from "@/lib/interfaces/trade-offers";

function TradeOfferLibrarySection({ title, offers }: TradeOfferLibrarySectionProps) {
  const { t, i18n } = useTranslation();
  if (offers.length === 0) return null;
  return (
    <View style={{ gap: SPACING.sm }}>
      <SectionHeader title={title} />
      <ListGroup>
        {offers.map((offer) => (
          <ListRow
            key={offer.guid}
            icon="transfer"
            title={
              offer.guestName ||
              (offer.linkKind === "inPerson" ? t("tradeOffers.inPerson.title") : t("tradeOffers.library.unnamedGuest"))
            }
            subtitle={`${
              offer.linkKind === "inPerson"
                ? t("tradeOffers.inPerson.rowDetails", {
                    given: offer.wanted.length,
                    received: offer.offered.reduce((sum, card) => sum + card.quantity, 0),
                  })
                : t("tradeOffers.library.rowDetails", {
                    source: offer.sourceName ?? t("tradeOffers.unknownSource"),
                    wanted: offer.wanted.length,
                    offered: offer.offered.reduce((sum, card) => sum + card.quantity, 0),
                  })
            }\n${new Date(offer.createdAt).toLocaleDateString(i18n.language, { dateStyle: "medium" })}`}
            right={
              <View style={{ alignItems: "flex-end", gap: SPACING.xs, flexShrink: 0 }}>
                <AppText
                  weight="semibold"
                  numberOfLines={1}
                  accessibilityLabel={formatPrice(offer.offeredValue, offer.priceSource)}
                >
                  {formatCompactPriceInCurrency(offer.offeredValue, PRICE_SOURCE_FIELDS[offer.priceSource].currency)}
                </AppText>
                {isTradeOfferBeingPicked(offer) ? (
                  <Pill
                    label={t("tradeOffers.library.picking", { count: offer.remainingPickScanIds?.length ?? 0 })}
                    tone="info"
                  />
                ) : offer.status !== "pending" ? (
                  <Pill label={t(`tradeOffers.library.status.${offer.status}`)} tone={TRADE_OFFER_STATUS_TONES[offer.status]} />
                ) : null}
              </View>
            }
            accessibilityHint={t("tradeOffers.review")}
            onPress={() => router.push({ pathname: "/trade-offer/[guid]", params: { guid: offer.guid } })}
          />
        ))}
      </ListGroup>
    </View>
  );
}

function ReceivedTradeOffers() {
  const { t } = useTranslation();
  const orgId = useActiveOrgId();
  const offers = useQuery(tradeOffersQueryOptions(orgId));
  const newestFirst = [...(offers.data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const isOpen = (offer: TradeOffer) => offer.status === "pending" || isTradeOfferBeingPicked(offer);
  const openOffers = newestFirst.filter(isOpen);
  const answeredOffers = newestFirst.filter((offer) => !isOpen(offer));

  return offers.isPending ? (
    <ListSkeleton rows={TRADE_OFFERS_SKELETON_ROWS} />
  ) : offers.isError ? (
    <Callout
      tone="destructive"
      title={t("tradeOffers.library.loadFailed")}
      action={
        <Button
          size="sm"
          variant="secondary"
          label={t("recovery.retry")}
          loading={offers.isRefetching}
          onPress={() => void offers.refetch()}
        />
      }
    />
  ) : newestFirst.length === 0 ? (
    <EmptyState icon="transfer" title={t("tradeOffers.library.emptyTitle")} description={t("tradeOffers.library.emptyDescription")} />
  ) : (
    <>
      <TradeOfferLibrarySection title={t("tradeOffers.library.open")} offers={openOffers} />
      <TradeOfferLibrarySection title={t("tradeOffers.library.answered")} offers={answeredOffers} />
    </>
  );
}

function SentTradeOffers() {
  const { t, i18n } = useTranslation();
  const userId = useSession().user?.id ?? null;
  const offers = useQuery(outgoingTradeOffersQueryOptions(userId));

  return offers.isPending ? (
    <ListSkeleton rows={TRADE_OFFERS_SKELETON_ROWS} />
  ) : offers.isError ? (
    <Callout
      tone="destructive"
      title={t("tradeOffers.sent.loadFailed")}
      action={
        <Button
          size="sm"
          variant="secondary"
          label={t("recovery.retry")}
          loading={offers.isRefetching}
          onPress={() => void offers.refetch()}
        />
      }
    />
  ) : offers.data.length === 0 ? (
    <EmptyState icon="send" title={t("tradeOffers.sent.emptyTitle")} description={t("tradeOffers.sent.emptyDescription")} />
  ) : (
    <ListGroup>
      {offers.data.map((offer) => (
        <ListRow
          key={offer.guid}
          icon="send"
          title={offer.sentToName ?? t("tradeOffers.sent.unknownRecipient")}
          subtitle={`${t("tradeOffers.sent.rowDetails", {
            wanted: offer.wanted.length,
            offered: offer.offered.reduce((sum, card) => sum + card.quantity, 0),
          })}\n${new Date(offer.createdAt).toLocaleDateString(i18n.language, { dateStyle: "medium" })}`}
          right={
            <Pill label={t(`tradeOffers.sent.status.${offer.status}`)} tone={TRADE_OFFER_STATUS_TONES[offer.status]} />
          }
          accessibilityHint={t("tradeOffers.sent.openHint")}
          onPress={() => router.push({ pathname: "/sent-trade-offer/[guid]", params: { guid: offer.guid } })}
        />
      ))}
    </ListGroup>
  );
}

export function TradesLibraryView({ title, viewSwitcher }: LibraryViewProps) {
  const { t } = useTranslation();
  const orgId = useActiveOrgId();
  const userId = useSession().user?.id ?? null;
  const [box, setBox] = useState<TradesBox>("received");
  const receivedOffers = useQuery(tradeOffersQueryOptions(orgId));
  const sentOffers = useQuery(outgoingTradeOffersQueryOptions(userId));
  const visibleOffers = box === "sent" ? sentOffers : receivedOffers;
  const [newTradeSheet, setNewTradeSheet] = useState<NewTradeSheet | null>(null);

  return (
    <Screen
      onRefresh={() => visibleOffers.refetch()}
      header={
        <PageHeader
          title={title}
          subtitle={t("tradeOffers.library.subtitle")}
          actions={
            <IconButton
              icon="plus"
              accessibilityLabel={t("tradeOffers.newTrade.button")}
              onPress={() => setNewTradeSheet("kind")}
            />
          }
        >
          {viewSwitcher}
        </PageHeader>
      }
    >
      <SegmentedControl
        options={TRADES_BOXES.map((value) => ({ value, label: t(`tradeOffers.boxes.${value}`) }))}
        value={box}
        onChange={setBox}
      />
      {box === "sent" ? <SentTradeOffers /> : <ReceivedTradeOffers />}
      <NewTradeSheets openSheet={newTradeSheet} onOpenSheetChange={setNewTradeSheet} />
    </Screen>
  );
}
