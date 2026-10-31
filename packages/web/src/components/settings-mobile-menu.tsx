import { PlanLockTag } from "@/components/plan-lock-tag";
import { usePlanLockedPath } from "@/hooks/use-plan-locked-path";
import { useSettingsSections } from "@/hooks/use-settings-sections";
import { cn } from "@/lib/utils";
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
  const { planLockFor } = usePlanLockedPath();

  return (
    <nav className={MOBILE_LIST_CLASS}>
      {sections.map((section) => {
        const path = `${SETTINGS_PATHS.root}/${section.path}`;
        const lock = planLockFor(path);
        return (
          <Link
            key={section.path}
            to={path}
            aria-disabled={lock?.isDisabled ? true : undefined}
            className={cn(
              MOBILE_LIST_ROW_CLASS,
              lock?.isDisabled && "pointer-events-none opacity-50",
            )}
          >
            <span className={MOBILE_ICON_TILE_CLASS}>
              <section.icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1 truncate">
              {t(section.labelKey)}
            </span>
            {lock ? (
              <PlanLockTag label={lock.tag} />
            ) : (
              <IconChevronRight className="size-4 shrink-0 text-foreground/70" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
