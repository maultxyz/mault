import { AlertTrayTrigger } from "@/components/alert-tray-trigger";
import { MobileMoreSheet } from "@/components/mobile-more-sheet";
import { useCollectionLocks } from "@/features/collections/api/use-collection-locks";
import { useLiveSessionCounts } from "@/features/collections/api/use-live-counts";
import { MOBILE_MORE_PATHS, MOBILE_NAV_TAB_CLASS } from "@/lib/constants/nav";
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

function TabIcon({ icon, active, dot, count }: MobileNavTabIconProps) {
  return (
    <span
      className={cn(
        "relative flex h-7 w-12 items-center justify-center rounded-full transition-colors",
        active && "bg-primary/15 text-primary",
      )}
    >
      {icon}
      {dot && (
        <span className="absolute top-0.5 right-2.5 size-2 rounded-full bg-green-500 ring-2 ring-sidebar" />
      )}
      {!!count && (
        <span className="absolute -top-0.5 right-1 min-w-4 rounded-full bg-destructive px-1 text-[10px] leading-4 font-semibold text-white ring-2 ring-sidebar">
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
        active ? "text-foreground" : "text-foreground/60",
      )}
    >
      <TabIcon icon={icon} active={active} dot={badge} />
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
        active ? "text-foreground" : "text-foreground/60",
        className,
      )}
      {...props}
    >
      <TabIcon icon={icon} active={active} count={badgeCount} />
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
    <nav className="grid flex-none grid-cols-4 border-t bg-sidebar pb-[env(safe-area-inset-bottom)]">
      <MobileNavTab
        to="/app/monitor"
        icon={<IconHeartRateMonitor size={20} />}
        label={t("nav.monitor")}
        active={pathname.startsWith("/app/monitor")}
        badge={hasLiveSessions}
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
