import { MOBILE_NAV_SCROLL_PADDING_CLASS } from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { SectionNav } from "@/components/section-nav";
import { useBillingCheckoutReturn } from "@/features/billing/api/use-billing-checkout-return";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useSettingsSections } from "@/hooks/use-settings-sections";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router-dom";

export default function SettingsLayout() {
  const { t } = useTranslation("settings");
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const sections = useSettingsSections();
  useBillingCheckoutReturn();

  if (isMobile) {
    const current = sections.find(
      (section) => pathname === `${SETTINGS_PATHS.root}/${section.path}`,
    );
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {current ? (
          <MobilePageHeader
            title={t(current.labelKey)}
            backTo={SETTINGS_PATHS.root}
          />
        ) : (
          <MobilePageHeader title={t("title")} subtitle={t("subtitle")} />
        )}
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto",
            MOBILE_NAV_SCROLL_PADDING_CLASS,
          )}
        >
          <div className="flex w-full flex-col gap-4 p-3">
            <Outlet />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden lg:grid lg:grid-cols-12">
      <SectionNav
        title={t("title")}
        subtitle={t("subtitle")}
        items={sections.map((section) => ({
          to: section.path,
          icon: <section.icon size={16} />,
          label: t(section.labelKey),
        }))}
        className="lg:col-span-2"
      />

      <div className="flex-1 lg:col-span-10 min-h-0 lg:h-full overflow-y-auto">
        <div className="flex flex-col p-4 md:p-6 max-w-4xl mx-auto w-full gap-4">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
