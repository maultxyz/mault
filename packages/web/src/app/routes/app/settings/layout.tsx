import { SectionNav } from "@/components/section-nav";
import { useBillingCheckoutReturn } from "@/features/billing/api/use-billing-checkout-return";
import { AUTH_PROVIDER } from "@/lib/auth/provider";
import { SETTINGS_SECTIONS } from "@/lib/constants/settings";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";

export default function SettingsLayout() {
  const { t } = useTranslation("settings");
  useBillingCheckoutReturn();

  const sections = SETTINGS_SECTIONS.filter(
    (section) => !("hostedOnly" in section) || AUTH_PROVIDER !== "local",
  );

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
