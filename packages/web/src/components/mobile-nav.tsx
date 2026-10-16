import {
  MOBILE_ACCOUNT_PATH,
  MOBILE_ACCOUNT_TAB_PATHS,
  MOBILE_HOME_PATH,
  MOBILE_NAV_TAB_ACTIVE_CLASS,
  MOBILE_NAV_TAB_CLASS,
  MOBILE_SCAN_PATH,
  MOBILE_SORTER_PATH,
} from "@/lib/constants/nav";
import { STORAGE_PATH } from "@/lib/constants/storage";
import type {
  MobileNavTabIconProps,
  MobileNavTabProps,
} from "@/lib/interfaces/nav";
import { cn } from "@/lib/utils";
import {
  IconBox,
  IconHome,
  IconScan,
  IconUserCircle,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { useCollectionLocks, useLiveSessionCounts } from "@/lib/app-stream";

function TabIcon({ icon, dot }: MobileNavTabIconProps) {
  return (
    <span className="relative flex h-6 w-8 items-center justify-center">
      {icon}
      {dot && (
        <span className="absolute top-0 right-1.5 size-2.5 rounded-full bg-success ring-2 ring-background" />
      )}
    </span>
  );
}

function MobileNavTab({ to, icon, label, active, badge }: MobileNavTabProps) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={cn(
        MOBILE_NAV_TAB_CLASS,
        active ? MOBILE_NAV_TAB_ACTIVE_CLASS : "text-foreground/70",
      )}
    >
      <TabIcon icon={icon} dot={badge} />
      {label}
    </Link>
  );
}

export function MobileNav() {
  const { t } = useTranslation("common");
  const { pathname } = useLocation();
  const { locks, currentUserId } = useCollectionLocks();
  const liveCounts = useLiveSessionCounts();

  const hasLiveSessions = !!(
    currentUserId &&
    Object.entries(liveCounts).some(
      ([guid, count]) => locks[guid]?.userId === currentUserId && count > 0,
    )
  );

  return (
    <nav className="absolute inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background pb-[env(safe-area-inset-bottom)]">
      <MobileNavTab
        to={MOBILE_HOME_PATH}
        icon={<IconHome size={22} />}
        label={t("mobileTabs.home")}
        active={pathname.startsWith(MOBILE_HOME_PATH)}
        badge={hasLiveSessions}
      />
      <MobileNavTab
        to={MOBILE_SCAN_PATH}
        icon={<IconScan size={22} />}
        label={t("mobileTabs.scan")}
        active={
          pathname.startsWith(MOBILE_SCAN_PATH) ||
          pathname.startsWith(MOBILE_SORTER_PATH)
        }
      />
      <MobileNavTab
        to={STORAGE_PATH}
        icon={<IconBox size={22} />}
        label={t("mobileTabs.storage")}
        active={pathname.startsWith(STORAGE_PATH)}
      />
      <MobileNavTab
        to={MOBILE_ACCOUNT_PATH}
        icon={<IconUserCircle size={22} />}
        label={t("mobileTabs.account")}
        active={MOBILE_ACCOUNT_TAB_PATHS.some((path) =>
          pathname.startsWith(path),
        )}
      />
    </nav>
  );
}
