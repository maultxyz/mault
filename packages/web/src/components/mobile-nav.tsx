import {
  LIBRARY_PATH,
  MOBILE_ACCOUNT_PATH,
  MOBILE_ACCOUNT_TAB_PATHS,
  MOBILE_HOME_PATH,
  MOBILE_NAV_TAB_ACTIVE_CLASS,
  MOBILE_NAV_TAB_ICON_ACTIVE_CLASS,
  MOBILE_NAV_TAB_CLASS,
  MOBILE_SCAN_PATH,
  MOBILE_SORTER_PATH,
} from "@/lib/constants/nav";
import { SORTING_RULES_PATH } from "@/lib/constants/bins";
import {
  INTAKE_PATH,
  LEGACY_INTAKE_PATH,
  ORDERS_PATH,
} from "@/lib/constants/business";
import { STORAGE_PATH } from "@/lib/constants/storage";
import { TRADES_PATH } from "@/lib/constants/trade-offers";
import type {
  MobileNavTabIconProps,
  MobileNavTabProps,
} from "@/lib/interfaces/nav";
import { cn } from "@/lib/utils";
import {
  IconAlbum,
  IconBuildingStore,
  IconHome,
  IconMenu2,
  IconScan,
} from "@tabler/icons-react";
import { useHasBusinessTools } from "@/features/business/api/use-has-business-tools";
import { usePiHost } from "@/hooks/use-pi-host";
import { usesHostHardware } from "@/lib/host";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { useCollectionLocks, useLiveSessionCounts } from "@/lib/app-stream";
import { SEARCH_PATH } from "@/lib/constants/search";

function TabIcon({ icon, dot, active }: MobileNavTabIconProps) {
  return (
    <span
      className={cn(
        "relative flex h-7 w-12 items-center justify-center rounded-lg transition-colors",
        active && MOBILE_NAV_TAB_ICON_ACTIVE_CLASS,
      )}
    >
      {icon}
      {dot && (
        <span className="absolute top-0 right-1.5 size-2.5 rounded-full bg-success ring-2 ring-sidebar" />
      )}
    </span>
  );
}

function MobileNavTab({
  to,
  icon,
  label,
  active,
  badge,
  lockTag,
  disabled,
}: MobileNavTabProps) {
  const { t } = useTranslation("common");
  return (
    <Link
      to={to}
      onClick={disabled ? (event) => event.preventDefault() : undefined}
      aria-current={active ? "page" : undefined}
      aria-disabled={disabled ? true : undefined}
      aria-label={lockTag ? `${label}, ${lockTag}` : undefined}
      className={cn(
        MOBILE_NAV_TAB_CLASS,
        active ? MOBILE_NAV_TAB_ACTIVE_CLASS : "text-foreground/70",
        disabled && "pointer-events-none text-foreground/40",
      )}
    >
      <TabIcon icon={icon} dot={badge} active={active} />
      {label}
      {badge && <span className="sr-only">{t("a11y.liveSession")}</span>}
      {lockTag && <span className="text-2xs leading-none">{lockTag}</span>}
    </Link>
  );
}

export function MobileNav() {
  const { t } = useTranslation("common");
  const { pathname } = useLocation();
  const piRemote = usePiHost() && usesHostHardware();
  const scanPath = piRemote ? "/app" : MOBILE_SCAN_PATH;
  const { locks, currentUserId } = useCollectionLocks();
  const liveCounts = useLiveSessionCounts();
  const hasBusinessTools = useHasBusinessTools();
  const isBusinessPath =
    pathname.startsWith(ORDERS_PATH) || pathname.startsWith(LEGACY_INTAKE_PATH);

  const hasLiveSessions = !!(
    currentUserId &&
    Object.entries(liveCounts).some(
      ([guid, count]) => locks[guid]?.userId === currentUserId && count > 0,
    )
  );

  return (
    <nav
      aria-label={t("a11y.mainNavigation")}
      className={cn(
        "absolute inset-x-0 bottom-0 z-40 grid bg-sidebar pb-[env(safe-area-inset-bottom)]",
        hasBusinessTools ? "grid-cols-5" : "grid-cols-4",
      )}
    >
      <MobileNavTab
        to={MOBILE_HOME_PATH}
        icon={<IconHome size={22} />}
        label={t("mobileTabs.home")}
        active={
          pathname.startsWith(MOBILE_HOME_PATH) ||
          pathname.startsWith(SEARCH_PATH)
        }
        badge={hasLiveSessions}
      />
      <MobileNavTab
        to={scanPath}
        icon={<IconScan size={22} />}
        label={t("mobileTabs.scan")}
        active={
          pathname.startsWith(MOBILE_SCAN_PATH) ||
          pathname.startsWith(MOBILE_SORTER_PATH) ||
          (piRemote &&
            (pathname === "/app" || pathname.startsWith("/app/cards/")))
        }
      />
      <MobileNavTab
        to={LIBRARY_PATH}
        icon={<IconAlbum size={22} />}
        label={t("mobileTabs.library")}
        active={
          pathname.startsWith(LIBRARY_PATH) ||
          pathname.startsWith(STORAGE_PATH) ||
          pathname.startsWith(TRADES_PATH) ||
          pathname.startsWith("/app/monitor/")
        }
      />
      {hasBusinessTools && (
        <MobileNavTab
          to={INTAKE_PATH}
          icon={<IconBuildingStore size={22} />}
          label={t("mobileTabs.business")}
          active={isBusinessPath}
        />
      )}
      <MobileNavTab
        to={MOBILE_ACCOUNT_PATH}
        icon={<IconMenu2 size={22} />}
        label={t("mobileTabs.more")}
        active={
          !(hasBusinessTools && isBusinessPath) &&
          (MOBILE_ACCOUNT_TAB_PATHS.some((path) => pathname.startsWith(path)) ||
            pathname.startsWith(SORTING_RULES_PATH))
        }
      />
    </nav>
  );
}
