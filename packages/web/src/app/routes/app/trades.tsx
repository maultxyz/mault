import { MobilePageHeader } from "@/components/mobile-page-header";
import { PageHeader } from "@/components/page-header";
import { LibraryViewTabs } from "@/features/library/components/library-view-tabs";
import { TradeOfferLibrary } from "@/features/trade-offers/components/trade-offer-library";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MOBILE_NAV_SCROLL_PADDING_CLASS, MOBILE_PAGE_BODY_CLASS } from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export default function TradesPage() {
  const { t } = useTranslation("common");
  const { t: tHome } = useTranslation("home");
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <MobilePageHeader title={tHome("library.title")}>
          <LibraryViewTabs value="trades" />
        </MobilePageHeader>
        <div className={cn("min-h-0 flex-1 overflow-y-auto", MOBILE_NAV_SCROLL_PADDING_CLASS)}>
          <div className={MOBILE_PAGE_BODY_CLASS}>
            <TradeOfferLibrary />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <PageHeader
        title={t("nav.library")}
        description={t("tradeOffers.library.subtitle")}
        tabs={<LibraryViewTabs value="trades" />}
      />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:gap-2 md:px-3 md:py-2">
        <TradeOfferLibrary />
      </div>
    </div>
  );
}
