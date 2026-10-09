import { useSettingsSections } from "@/hooks/use-settings-sections";
import {
  MOBILE_ICON_TILE_CLASS,
  MOBILE_LIST_CLASS,
  MOBILE_LIST_ROW_CLASS,
} from "@/lib/constants/nav";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import { IconChevronRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function SettingsMobileMenu() {
  const { t } = useTranslation("settings");
  const sections = useSettingsSections();

  return (
    <nav className={MOBILE_LIST_CLASS}>
      {sections.map((section) => (
        <Link
          key={section.path}
          to={`${SETTINGS_PATHS.root}/${section.path}`}
          className={MOBILE_LIST_ROW_CLASS}
        >
          <span className={MOBILE_ICON_TILE_CLASS}>
            <section.icon className="size-5" />
          </span>
          <span className="min-w-0 flex-1 truncate">{t(section.labelKey)}</span>
          <IconChevronRight className="size-4 shrink-0 text-foreground/70" />
        </Link>
      ))}
    </nav>
  );
}
