import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  IconBug,
  IconCards,
  IconDeviceGamepad2,
  IconRotate360,
  IconSpeakerphone,
  IconUserScan,
} from "@tabler/icons-react";
import { NavLink, Outlet } from "react-router-dom";
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
    <div className="grid grid-cols-12 flex-1 min-h-0 overflow-hidden">
      <nav className="col-span-3 md:col-span-2 min-h-0 h-full overflow-y-auto flex flex-col border-r p-2 gap-2 bg-sidebar/70">
        <div className="px-1.5 pt-1 pb-2">
          <h1 className="text-lg font-semibold font-heading">
            {t("page.title")}
          </h1>
          <p className="text-xs text-muted-foreground">{t("page.subtitle")}</p>
        </div>
        {SECTION_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                buttonVariants({ variant: isActive ? "secondary" : "ghost" }),
                "w-full justify-start gap-2 px-2.5 border-0",
              )
            }
          >
            <item.icon size={16} />
            <span className="truncate">{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="col-span-9 md:col-span-10 min-h-0 h-full overflow-y-auto">
        <div className="flex flex-col p-4 md:p-6 max-w-4xl mx-auto w-full gap-4">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
