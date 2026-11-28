import { MobilePageHeader } from "@/components/mobile-page-header";
import { LibraryPageHeader } from "@/features/library/components/library-page-header";
import { LibraryViewTabs } from "@/features/library/components/library-view-tabs";
import { useTradesBox } from "@/features/trade-offers/api/use-trades-box";
import { NewTradeMenu } from "@/features/trade-offers/components/new-trade-menu";
import { TradeOfferLibrary } from "@/features/trade-offers/components/trade-offer-library";
import { TradesBoxSwitch } from "@/features/trade-offers/components/trades-box-switch";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MOBILE_NAV_SCROLL_PADDING_CLASS, MOBILE_PAGE_BODY_CLASS } from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export default function TradesPage() {
  const { t } = useTranslation("common");
  const { t: tHome } = useTranslation("home");
  const isMobile = useIsMobile();
  const { box, changeBox } = useTradesBox();

  if (isMobile) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <MobilePageHeader title={tHome("library.title")} actions={<NewTradeMenu />}>
          <LibraryViewTabs value="trades" />
        </MobilePageHeader>
        <div className={cn("min-h-0 flex-1 overflow-y-auto", MOBILE_NAV_SCROLL_PADDING_CLASS)}>
          <div className={MOBILE_PAGE_BODY_CLASS}>
            <TradesBoxSwitch box={box} onChange={changeBox} />
            <TradeOfferLibrary box={box} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <LibraryPageHeader
        view="trades"
        description={t("tradeOffers.library.subtitle")}
        actions={<NewTradeMenu />}
      />
      <div className="flex w-full flex-col gap-5 p-4 md:gap-2 md:px-3 md:py-2">
        <TradesBoxSwitch box={box} onChange={changeBox} />
        <TradeOfferLibrary box={box} />
      </div>
    </div>
  );
}
