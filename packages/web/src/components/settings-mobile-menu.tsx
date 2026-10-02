import { useSettingsSections } from "@/hooks/use-settings-sections";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import { IconChevronRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function SettingsMobileMenu() {
  const { t } = useTranslation("settings");
  const sections = useSettingsSections();

  return (
    <nav className="flex flex-col divide-y overflow-hidden rounded-lg border">
      {sections.map((section) => (
        <Link
          key={section.path}
          to={`${SETTINGS_PATHS.root}/${section.path}`}
          className="flex min-h-13 items-center gap-3 px-3 text-sm text-foreground active:bg-muted"
        >
          <section.icon className="size-5 shrink-0 text-foreground/70" />
          <span className="min-w-0 flex-1 truncate">{t(section.labelKey)}</span>
          <IconChevronRight className="size-4 shrink-0 text-foreground/70" />
        </Link>
      ))}
    </nav>
  );
}
