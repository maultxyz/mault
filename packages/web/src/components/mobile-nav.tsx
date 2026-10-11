import { AlertTrayTrigger } from "@/components/alert-tray-trigger";
import { MobileMoreSheet } from "@/components/mobile-more-sheet";
import {
  MOBILE_MORE_PATHS,
  MOBILE_NAV_TAB_ACTIVE_CLASS,
  MOBILE_SCAN_PATH,
  MOBILE_NAV_TAB_CLASS,
} from "@/lib/constants/nav";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import type {
  MobileNavButtonProps,
  MobileNavTabIconProps,
  MobileNavTabProps,
} from "@/lib/interfaces/nav";
import { cn } from "@/lib/utils";
import {
  IconBell,
  IconHeartRateMonitor,
  IconMenu2,
  IconScan,
  IconSettings,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { useCollectionLocks, useLiveSessionCounts } from "@/lib/app-stream";

function TabIcon({ icon, dot, count }: MobileNavTabIconProps) {
  return (
    <span className="relative flex h-6 w-8 items-center justify-center">
      {icon}
      {dot && (
        <span className="absolute top-0 right-1.5 size-2.5 rounded-full bg-success ring-2 ring-background" />
      )}
      {!!count && (
        <span className="absolute -top-1 right-0 min-w-4 rounded-full bg-destructive-strong px-1 text-2xs leading-4 font-semibold text-white ring-2 ring-background">
          {count > 9 ? "9+" : count}
        </span>
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

function MobileNavButton({
  icon,
  label,
  active = false,
  badgeCount,
  className,
  ...props
}: MobileNavButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        MOBILE_NAV_TAB_CLASS,
        active ? MOBILE_NAV_TAB_ACTIVE_CLASS : "text-foreground/70",
        className,
      )}
      {...props}
    >
      <TabIcon icon={icon} count={badgeCount} />
      {label}
    </button>
  );
}

export function MobileNav() {
  const { t } = useTranslation("common");
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { locks, currentUserId } = useCollectionLocks();
  const liveCounts = useLiveSessionCounts();

  const hasLiveSessions = !!(
    currentUserId &&
    Object.entries(liveCounts).some(
      ([guid, count]) => locks[guid]?.userId === currentUserId && count > 0,
    )
  );
  const moreActive =
    moreOpen || MOBILE_MORE_PATHS.some((path) => pathname.startsWith(path));

  return (
    <nav className="absolute inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background pb-[env(safe-area-inset-bottom)]">
      <MobileNavTab
        to="/app/monitor"
        icon={<IconHeartRateMonitor size={20} />}
        label={t("nav.monitor")}
        active={pathname.startsWith("/app/monitor")}
        badge={hasLiveSessions}
      />
      <MobileNavTab
        to={MOBILE_SCAN_PATH}
        icon={<IconScan size={20} />}
        label={t("nav.scan")}
        active={pathname.startsWith(MOBILE_SCAN_PATH)}
      />
      <MobileNavTab
        to={SETTINGS_PATHS.root}
        icon={<IconSettings size={20} />}
        label={t("nav.settings")}
        active={pathname.startsWith(SETTINGS_PATHS.root)}
      />
      <AlertTrayTrigger
        side="top"
        align="center"
        trigger={(count) => (
          <MobileNavButton
            icon={<IconBell size={20} />}
            label={t("nav.alerts")}
            badgeCount={count}
          />
        )}
      />
      <MobileNavButton
        icon={<IconMenu2 size={20} />}
        label={t("nav.more")}
        active={moreActive}
        onClick={() => setMoreOpen(true)}
      />
      <MobileMoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </nav>
  );
}
