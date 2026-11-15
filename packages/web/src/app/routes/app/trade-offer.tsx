import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { PageHeader } from "@/components/page-header";
import { useTradeOffers } from "@/features/trade-offers/api/trade-offers";
import { TradeOfferDetail } from "@/features/trade-offers/components/trade-offer-detail";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MOBILE_PAGE_BODY_CLASS } from "@/lib/constants/nav";
import { TRADE_OFFERS_SKELETON_ROWS, TRADES_PATH } from "@/lib/constants/trade-offers";
import { IconArrowsExchange } from "@tabler/icons-react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function TradeOfferRoutePage() {
  const { t } = useTranslation("common");
  const { offerGuid } = useParams();
  const isMobile = useIsMobile();
  const offers = useTradeOffers();
  const offer = offers.data?.find((candidate) => candidate.guid === offerGuid) ?? null;

  if (offer) return <TradeOfferDetail key={offer.guid} offer={offer} />;

  const content = offers.isPending ? (
    <ListSkeleton rows={TRADE_OFFERS_SKELETON_ROWS} />
  ) : offers.isError ? (
    <LoadErrorCallout message={t("tradeOffers.library.loadFailed")} onRetry={() => void offers.refetch()} />
  ) : (
    <EmptyState icon={IconArrowsExchange} title={t("tradeOffers.notFound")} />
  );

  if (isMobile) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <MobilePageHeader title={t("tradeOffers.title")} backTo={TRADES_PATH} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className={MOBILE_PAGE_BODY_CLASS}>{content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <PageHeader
        title={t("tradeOffers.title")}
        backTo={TRADES_PATH}
        backLabel={t("tradeOffers.backToTrades")}
      />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:gap-2 md:px-3 md:py-2">
        {content}
      </div>
    </div>
  );
}
