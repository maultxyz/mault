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
import { outgoingTradeOffersQueryOptions } from "@/features/trade-offers/api/outgoing-trade-offers";
import { OutgoingTradeOfferReview } from "@/features/trade-offers/components/outgoing-trade-offer-review";
import { useTheme } from "@/hooks/use-theme";
import { useSession } from "@/lib/auth/session";

export default function SentTradeOfferScreen() {
  const { guid } = useLocalSearchParams<{ guid: string }>();
  const { t } = useTranslation();
  const colors = useTheme();
  const userId = useSession().user?.id ?? null;
  const offers = useQuery(outgoingTradeOffersQueryOptions(userId));
  const offer = offers.data?.find((candidate) => candidate.guid === guid) ?? null;

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={
          offer
            ? t("tradeOffers.sent.detailTitle", {
                name: offer.sentToName ?? t("tradeOffers.sent.unknownRecipient"),
              })
            : t("tradeOffers.sent.title")
        }
      />
      {offer ? (
        <OutgoingTradeOfferReview key={offer.guid} offer={offer} />
      ) : (
        <PinnedActionsLayout>
          {offers.isLoading ? (
            <ListSkeleton />
          ) : offers.isError ? (
            <Callout
              tone="destructive"
              title={t("tradeOffers.sent.loadFailed")}
              action={
                <Button size="sm" variant="secondary" label={t("recovery.retry")} onPress={() => void offers.refetch()} />
              }
            />
          ) : (
            <EmptyState icon="send" title={t("tradeOffers.notFound")} />
          )}
        </PinnedActionsLayout>
      )}
    </View>
  );
}
