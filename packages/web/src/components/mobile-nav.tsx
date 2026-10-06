import { AlertTrayTrigger } from "@/components/alert-tray-trigger";
import { MobileMoreSheet } from "@/components/mobile-more-sheet";
import {
  MOBILE_MORE_PATHS,
  MOBILE_NAV_TAB_ACTIVE_CLASS,
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
  IconSettings,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { useCollectionLocks, useLiveSessionCounts } from "@/lib/app-stream";

function TabIcon({ icon, dot, count }: MobileNavTabIconProps) {
  return (
    <span className="relative flex h-5 w-8 items-center justify-center">
      {icon}
      {dot && (
        <span className="absolute top-0.5 right-2.5 size-2 rounded-full bg-success ring-2 ring-sidebar" />
      )}
      {!!count && (
        <span className="absolute -top-0.5 right-1 min-w-4 rounded-full bg-destructive px-1 text-2xs leading-4 font-semibold text-white ring-2 ring-sidebar">
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
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <nav className="pointer-events-auto grid w-full max-w-xs grid-cols-4 gap-0.5 rounded-xl border bg-sidebar/80 p-1 shadow-sm backdrop-blur-md">
        <MobileNavTab
          to="/app/monitor"
          icon={<IconHeartRateMonitor size={18} />}
          label={t("nav.monitor")}
          active={pathname.startsWith("/app/monitor")}
          badge={hasLiveSessions}
        />
        <MobileNavTab
          to={SETTINGS_PATHS.root}
          icon={<IconSettings size={18} />}
          label={t("nav.settings")}
          active={pathname.startsWith(SETTINGS_PATHS.root)}
        />
        <AlertTrayTrigger
          side="top"
          align="center"
          trigger={(count) => (
            <MobileNavButton
              icon={<IconBell size={18} />}
              label={t("nav.alerts")}
              badgeCount={count}
            />
          )}
        />
        <MobileNavButton
          icon={<IconMenu2 size={18} />}
          label={t("nav.more")}
          active={moreActive}
          onClick={() => setMoreOpen(true)}
        />
        <MobileMoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
      </nav>
    </div>
  );
}
