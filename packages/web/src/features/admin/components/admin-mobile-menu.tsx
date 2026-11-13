import { useRole } from "@/hooks/use-role";
import { ADMIN_PATH, ADMIN_SECTIONS } from "@/lib/constants/admin";
import {
  MOBILE_ICON_TILE_CLASS,
  MOBILE_LIST_CLASS,
  MOBILE_LIST_ROW_CLASS,
} from "@/lib/constants/nav";
import { IconChevronRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function AdminMobileMenu() {
  const { t } = useTranslation("admin");
  const { t: tCommon } = useTranslation("common");
  const { isAdmin } = useRole();

  return (
    <nav
      aria-label={tCommon("a11y.adminNavigation")}
      className={MOBILE_LIST_CLASS}
    >
      {ADMIN_SECTIONS.filter((section) => isAdmin || !section.adminOnly).map(
        (section) => (
          <Link
            key={section.path}
            to={`${ADMIN_PATH}/${section.path}`}
            className={MOBILE_LIST_ROW_CLASS}
          >
            <span className={MOBILE_ICON_TILE_CLASS}>
              <section.icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1 truncate">
              {t(section.labelKey)}
            </span>
            <IconChevronRight className="size-4 shrink-0 text-foreground/70" />
          </Link>
        ),
      )}
    </nav>
  );
}
