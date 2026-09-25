import { SectionNav } from "@/components/section-nav";
import {
  IconBug,
  IconCards,
  IconDeviceGamepad2,
  IconRotate360,
  IconSpeakerphone,
  IconUserScan,
} from "@tabler/icons-react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";

const SECTION_ITEMS = [
  { path: "cards", icon: IconCards, labelKey: "sections.cards" },
  { path: "games", icon: IconDeviceGamepad2, labelKey: "sections.games" },
  { path: "users", icon: IconUserScan, labelKey: "sections.users" },
  {
    path: "announcements",
    icon: IconSpeakerphone,
    labelKey: "sections.announcements",
  },
  { path: "servos", icon: IconRotate360, labelKey: "sections.servos" },
  { path: "developer", icon: IconBug, labelKey: "sections.developer" },
] as const;

export default function AdminLayout() {
  const { t } = useTranslation("admin");

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden lg:grid lg:grid-cols-12">
      <SectionNav
        title={t("page.title")}
        subtitle={t("page.subtitle")}
        items={SECTION_ITEMS.map((item) => ({
          to: item.path,
          icon: <item.icon size={16} />,
          label: t(item.labelKey),
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
