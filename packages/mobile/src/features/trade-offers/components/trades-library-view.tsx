import { formatPrice } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { tradeOffersQueryOptions } from "@/features/trade-offers/api/trade-offers";
import { useActiveOrgId } from "@/hooks/use-org";
import { SPACING } from "@/lib/constants/theme";
import { TRADE_OFFER_STATUS_TONES, TRADE_OFFERS_SKELETON_ROWS } from "@/lib/constants/trade-offers";
import type { LibraryViewProps } from "@/lib/interfaces/library";
import type { TradeOfferLibrarySectionProps } from "@/lib/interfaces/trade-offers";

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
            title={offer.guestName || t("tradeOffers.library.unnamedGuest")}
            subtitle={`${t("tradeOffers.library.rowDetails", {
              source: offer.sourceName ?? t("tradeOffers.unknownSource"),
              wanted: offer.wanted.length,
              offered: offer.offered.reduce((sum, card) => sum + card.quantity, 0),
            })}\n${new Date(offer.createdAt).toLocaleDateString(i18n.language, { dateStyle: "medium" })}`}
            right={
              <View style={{ alignItems: "flex-end", gap: SPACING.xs, flexShrink: 0 }}>
                <AppText weight="semibold" numberOfLines={1}>
                  {formatPrice(offer.offeredValue, offer.priceSource)}
                </AppText>
                {offer.status !== "pending" ? (
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

export function TradesLibraryView({ title, viewSwitcher }: LibraryViewProps) {
  const { t } = useTranslation();
  const orgId = useActiveOrgId();
  const offers = useQuery(tradeOffersQueryOptions(orgId));
  const newestFirst = [...(offers.data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pendingOffers = newestFirst.filter((offer) => offer.status === "pending");
  const answeredOffers = newestFirst.filter((offer) => offer.status !== "pending");

  return (
    <Screen
      refreshing={offers.isRefetching}
      onRefresh={() => void offers.refetch()}
      header={
        <PageHeader title={title} subtitle={t("tradeOffers.library.subtitle")}>
          {viewSwitcher}
        </PageHeader>
      }
    >
      {offers.isPending ? (
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
          <TradeOfferLibrarySection title={t("tradeOffers.library.pending")} offers={pendingOffers} />
          <TradeOfferLibrarySection title={t("tradeOffers.library.answered")} offers={answeredOffers} />
        </>
      )}
    </Screen>
  );
}
