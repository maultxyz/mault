import { Callout } from "@/components/callout";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { BusinessOverviewBackButton } from "@/features/business/components/business-overview-back-button";
import { BusinessPageHeader } from "@/features/business/components/business-page-header";
import { ShopCatalogsSection } from "@/features/business/components/shop-catalogs-section";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MOBILE_NAV_SCROLL_PADDING_CLASS } from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function ShopCatalogsPage() {
  const { t } = useTranslation("business");
  const isMobile = useIsMobile();
  const { access } = useBusinessAccess();
  const description = t("shopCatalogs.description");

  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto", MOBILE_NAV_SCROLL_PADDING_CLASS)}>
      {isMobile ? (
        <MobilePageHeader title={t("views.catalogs")} subtitle={description} />
      ) : (
        <BusinessPageHeader view="catalogs" description={description} />
      )}
      <div className="flex w-full flex-col gap-4 p-4 md:gap-2 md:px-3 md:py-2">
        {isMobile && <BusinessOverviewBackButton />}
        {access && !access.canManageSettings ? (
          <Callout variant="info">{t("shopCatalogs.managersOnly")}</Callout>
        ) : (
          <ShopCatalogsSection />
        )}
      </div>
    </div>
  );
}
