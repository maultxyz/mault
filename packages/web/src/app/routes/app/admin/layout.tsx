import { SectionNav } from "@/components/section-nav";
import { SettingsSectionLayoutContext } from "@/lib/settings-section-context";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ADMIN_SECTIONS } from "@/lib/constants/admin";

export default function AdminLayout() {
  const { t } = useTranslation("admin");

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden lg:grid lg:grid-cols-12">
      <SectionNav
        title={t("page.title")}
        subtitle={t("page.subtitle")}
        items={ADMIN_SECTIONS.map((item) => ({
          to: item.path,
          icon: <item.icon size={16} />,
          label: t(item.labelKey),
        }))}
        className="lg:col-span-2"
      />

      <div className="flex-1 lg:col-span-10 min-h-0 lg:h-full overflow-y-auto">
        <div className="flex flex-col p-4 md:p-6 max-w-4xl mx-auto w-full gap-6">
          <SettingsSectionLayoutContext value="flat">
            <Outlet />
          </SettingsSectionLayoutContext>
        </div>
      </div>
    </div>
  );
}
