import { MobilePageHeader } from "@/components/mobile-page-header";
import { SectionNav } from "@/components/section-nav";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  MOBILE_ACCOUNT_PATH,
  MOBILE_NAV_SCROLL_PADDING_CLASS,
} from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import { SettingsSectionLayoutContext } from "@/lib/settings-section-context";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ADMIN_PATH, ADMIN_SECTIONS } from "@/lib/constants/admin";
import { useRole } from "@/hooks/use-role";

export default function AdminLayout() {
  const { t } = useTranslation("admin");
  const { isAdmin } = useRole();
  const { pathname } = useLocation();
  const isMobile = useIsMobile();

  if (isMobile) {
    const current = ADMIN_SECTIONS.find((section) =>
      pathname.startsWith(`${ADMIN_PATH}/${section.path}`),
    );
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {current ? (
          <MobilePageHeader title={t(current.labelKey)} backTo={ADMIN_PATH} />
        ) : (
          <MobilePageHeader
            title={t("page.title")}
            subtitle={t("page.subtitle")}
            backTo={MOBILE_ACCOUNT_PATH}
          />
        )}
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto",
            MOBILE_NAV_SCROLL_PADDING_CLASS,
          )}
        >
          <div className="flex w-full flex-col gap-5 p-4">
            <SettingsSectionLayoutContext value="flat">
              <Outlet />
            </SettingsSectionLayoutContext>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden lg:grid lg:grid-cols-12">
      <SectionNav
        title={t("page.title")}
        subtitle={t("page.subtitle")}
        items={ADMIN_SECTIONS.filter(
          (item) => isAdmin || !item.adminOnly,
        ).map((item) => ({
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
