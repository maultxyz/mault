import { MobilePageHeader } from "@/components/mobile-page-header";
import { PageHeader } from "@/components/page-header";
import { InPersonTradeForm } from "@/features/trade-offers/components/in-person-trade-form";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { TRADES_PATH } from "@/lib/constants/trade-offers";
import { useTranslation } from "react-i18next";

export default function InPersonTradePage() {
  const { t } = useTranslation("common");
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <MobilePageHeader title={t("tradeOffers.inPerson.title")} backTo={TRADES_PATH} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <InPersonTradeForm />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <PageHeader
        title={t("tradeOffers.inPerson.title")}
        description={t("tradeOffers.inPerson.description")}
        backTo={TRADES_PATH}
        backLabel={t("tradeOffers.backToTrades")}
      />
      <InPersonTradeForm />
    </div>
  );
}
