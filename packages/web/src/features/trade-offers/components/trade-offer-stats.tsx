import { StatGroup } from "@/components/stat-group";
import type { OutgoingTradeOfferStatsProps, TradeOfferStatsProps } from "@/lib/interfaces/trade-offers";
import { countTradeOffersWithStatus as countWithStatus } from "@/features/trade-offers/lib/trade-offer-row-cards";
import { isTradeOfferBeingPicked, TRADE_OFFER_STATUSES } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function TradeOfferStats({ offers }: TradeOfferStatsProps) {
  const { t } = useTranslation("common");
  const pickingCount = offers.filter(isTradeOfferBeingPicked).length;
  return (
    <StatGroup
      heading={t("tradeOffers.library.stats.heading")}
      gridClassName="grid-cols-4"
      tiles={[
        { key: "open", label: t("tradeOffers.library.open"), value: countWithStatus(offers, "pending") },
        { key: "picking", label: t("tradeOffers.library.stats.picking"), value: pickingCount },
        {
          key: "accepted",
          label: t("tradeOffers.library.status.accepted"),
          value: countWithStatus(offers, "accepted") - pickingCount,
        },
        { key: "declined", label: t("tradeOffers.library.status.declined"), value: countWithStatus(offers, "declined") },
      ]}
    />
  );
}

export function OutgoingTradeOfferStats({ offers }: OutgoingTradeOfferStatsProps) {
  const { t } = useTranslation("common");
  return (
    <StatGroup
      heading={t("tradeOffers.sent.stats.heading")}
      gridClassName="grid-cols-3"
      tiles={TRADE_OFFER_STATUSES.map((status) => ({
        key: status,
        label: t(`tradeOffers.sent.status.${status}`),
        value: countWithStatus(offers, status),
      }))}
    />
  );
}
