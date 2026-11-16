import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { pendingTradeOffersQueryOptions, tradeOffersQueryOptions } from "@/features/trade-offers/api/trade-offers";
import { TradeOfferReview } from "@/features/trade-offers/components/trade-offer-review";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";

export default function TradeOfferScreen() {
  const { guid } = useLocalSearchParams<{ guid: string }>();
  const { t } = useTranslation();
  const colors = useTheme();
  const orgId = useActiveOrgId();
  const offers = useQuery(tradeOffersQueryOptions(orgId));
  const pendingOffers = useQuery(pendingTradeOffersQueryOptions(orgId));
  const offer =
    offers.data?.find((candidate) => candidate.guid === guid) ??
    (offers.data ? undefined : pendingOffers.data?.find((candidate) => candidate.guid === guid)) ??
    null;

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={offer ? t("tradeOffers.reviewTitle", { name: offer.guestName }) : t("tradeOffers.title")}
      />
      {offer ? (
        <TradeOfferReview key={offer.guid} offer={offer} />
      ) : (
        <PinnedActionsLayout>
          {offers.isLoading ? (
            <ListSkeleton />
          ) : offers.isError ? (
            <Callout
              tone="destructive"
              title={t("tradeOffers.loadFailed")}
              action={
                <Button size="sm" variant="secondary" label={t("recovery.retry")} onPress={() => void offers.refetch()} />
              }
            />
          ) : (
            <EmptyState icon="transfer" title={t("tradeOffers.notFound")} />
          )}
        </PinnedActionsLayout>
      )}
    </View>
  );
}
