import { AlertTrayTrigger } from "@/components/alert-tray-trigger";
import { LanguageSwitcherIcon } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserMenu } from "@/features/account/components/user-menu";
import { useCollectionLocks } from "@/features/collections/api/use-collection-locks";
import { useCollections } from "@/features/collections/api/use-collections";
import { useLiveSessionCounts } from "@/features/collections/api/use-live-counts";
import { OrgSwitcher } from "@/features/companies/components/org-switcher";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useRole } from "@/hooks/use-role";
import { DISCORD_URL } from "@/lib/links";
import { cn } from "@/lib/utils";
import {
  IconAdjustments,
  IconAlbum,
  IconBrandDiscord,
  IconCameraSpark,
  IconDatabaseCog,
  IconHeartRateMonitor,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconPigFilled,
  IconShoppingCart,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useNavigate } from "react-router-dom";

const EXPANDED_KEY = "sidebarExpanded";

interface NavSubItemDef {
  key: string;
  to: string;
  label: string;
  badge?: boolean;
  onClick?: () => void;
}

interface NavItemDef {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
  badge?: boolean;
  desktopOnly?: boolean;
  disabled?: boolean;
  tooltip?: string;
  subItems?: NavSubItemDef[];
}

function CollapsedNavItem({
  icon,
  label,
  to,
  end,
  badge,
  disabled,
  tooltip,
}: NavItemDef) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          disabled ? (
            <span
              aria-disabled="true"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-lg" }),
                "cursor-not-allowed text-muted-foreground/40 hover:bg-transparent hover:text-muted-foreground/40",
              )}
            />
          ) : (
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                buttonVariants({
                  variant: isActive ? "secondary" : "ghost",
                  size: "icon-lg",
                })
              }
            />
          )
        }
      >
        <span className="relative">
          {icon}
          {badge && (
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-green-500 ring-1 ring-background" />
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="right">{disabled ? tooltip : label}</TooltipContent>
    </Tooltip>
  );
}

function CollapsedNavItemWithSubItems({
  to,
  end,
  icon,
  label,
  subItems,
}: NavItemDef & { subItems: NavSubItemDef[] }) {
  const { t } = useTranslation("collections");
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        openOnHover
        delay={150}
        closeDelay={100}
        render={
          <NavLink
            to={to}
            end={end}
            className={({ isActive }) =>
              buttonVariants({
                variant: isActive ? "secondary" : "ghost",
                size: "icon-lg",
              })
            }
          />
        }
      >
        {icon}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-56"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          {subItems.length > 0 ? (
            subItems.map((sub) => (
              <DropdownMenuItem
                key={sub.key}
                onClick={() => {
                  sub.onClick?.();
                  navigate(sub.to);
                }}
              >
                <span className="flex-1 truncate">{sub.label}</span>
                {sub.badge && (
                  <span className="shrink-0 size-1.5 rounded-full bg-green-500" />
                )}
              </DropdownMenuItem>
            ))
          ) : (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              {t("noCollectionsYet")}
            </p>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ExpandedNavItem({
  to,
  icon,
  label,
  end,
  badge,
  disabled,
  tooltip,
}: NavItemDef) {
  const inner = (
    <>
      <span className="relative shrink-0">
        {icon}
        {badge && (
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-green-500 ring-1 ring-background" />
        )}
      </span>
      <span className="truncate text-sm">{label}</span>
    </>
  );

  if (disabled) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              aria-disabled="true"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "w-full justify-start gap-2.5 px-2.5 border-0 cursor-not-allowed text-muted-foreground/40 hover:bg-transparent hover:text-muted-foreground/40",
              )}
            />
          }
        >
          {inner}
        </TooltipTrigger>
        <TooltipContent side="right">{tooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          buttonVariants({ variant: isActive ? "secondary" : "ghost" }),
          "w-full justify-start gap-2.5 px-2.5 border-0",
        )
      }
    >
      {inner}
    </NavLink>
  );
}

function SubItem({
  to,
  label,
  badge,
  onClick,
}: {
  to: string;
  label: string;
  badge?: boolean;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2 pl-9 pr-2 py-1 rounded-md text-xs transition-colors",
          isActive
            ? "text-foreground bg-secondary"
            : "text-muted-foreground hover:text-foreground",
        )
      }
    >
      <span className="truncate flex-1">{label}</span>
      {badge && (
        <span className="shrink-0 size-1.5 rounded-full bg-green-500" />
      )}
    </NavLink>
  );
}

function BottomNavItem({
  to,
  icon,
  label,
  end,
  badge,
  disabled,
  tooltip,
}: NavItemDef) {
  const inner = (
    <>
      <span className="relative">
        {icon}
        {badge && (
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-green-500 ring-1 ring-background" />
        )}
      </span>
      <span className="text-[10px] leading-none font-medium">{label}</span>
    </>
  );

  if (disabled) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              aria-disabled="true"
              className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-md cursor-not-allowed text-muted-foreground/40"
            />
          }
        >
          {inner}
        </TooltipTrigger>
        <TooltipContent side="top">{tooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center gap-0.5 px-2 py-1 rounded-md transition-all active:scale-90 text-muted-foreground",
          isActive && "text-foreground",
        )
      }
    >
      {inner}
    </NavLink>
  );
}

export function AppNav() {
  const { t } = useTranslation("common");
  const { isAdmin } = useRole();
  const isMobile = useIsMobile();
  const { collections, activateCollection } = useCollections();
  const { locks, currentUserId } = useCollectionLocks();

  const [expanded, setExpanded] = useState(
    () => localStorage.getItem(EXPANDED_KEY) === "true",
  );

  const toggle = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(EXPANDED_KEY, String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;
      toggle();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);

  const liveCounts = useLiveSessionCounts();

  const hasLiveSessions = !!(
    currentUserId &&
    Object.entries(liveCounts).some(
      ([guid, count]) => locks[guid]?.userId === currentUserId && count > 0,
    )
  );

  const monitorCollections = [...collections].sort((a, b) => {
    const aLive = !!locks[a.guid];
    const bLive = !!locks[b.guid];
    if (aLive !== bLive) return aLive ? -1 : 1;
    return 0;
  });

  const navItems: NavItemDef[] = [
    {
      to: "/app",
      icon: <IconCameraSpark size={20} />,
      label: t("nav.scanner"),
      end: true,
      desktopOnly: true,
    },
    {
      to: "/app/collections",
      icon: <IconAlbum size={20} />,
      label: t("nav.collections"),
      desktopOnly: true,
      subItems: collections.map((c) => ({
        key: c.guid,
        to: `/app/collections/${c.guid}/bins`,
        label: c.name,
        onClick: () => activateCollection(c.guid),
      })),
    },
    {
      to: "/app/monitor",
      icon: <IconHeartRateMonitor size={20} />,
      label: t("nav.monitor"),
      badge: hasLiveSessions,
      subItems: monitorCollections.map((c) => ({
        key: c.guid,
        to: `/app/monitor/${c.guid}`,
        label: c.name,
        badge: !!locks[c.guid],
      })),
    },
    {
      to: "/app/calibrate",
      icon: <IconAdjustments size={20} />,
      label: t("nav.calibrate"),
      desktopOnly: true,
    },
    {
      to: "",
      icon: <IconShoppingCart size={20} />,
      label: t("nav.cart"),
      disabled: true,
      tooltip: t("nav.comingSoon"),
    },
    ...(isAdmin
      ? [
          {
            to: "/app/admin",
            icon: <IconDatabaseCog size={20} />,
            label: t("nav.admin"),
            desktopOnly: true,
          },
        ]
      : []),
  ];

  if (isMobile) {
    const mobileItems = navItems.filter((item) => !item.desktopOnly);
    return (
      <nav className="flex-none flex flex-row items-center justify-around bg-sidebar border-t px-1 py-1">
        {mobileItems.map((item) => (
          <BottomNavItem key={item.to} {...item} />
        ))}
        <AlertTrayTrigger
          side="top"
          align="center"
          trigger={(count) => (
            <button
              type="button"
              aria-label={t("alerts.tray.trigger")}
              className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-md text-muted-foreground active:scale-90 transition-all"
            >
              <span className="relative">
                <IconPigFilled size={20} />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-3 h-3 rounded-full bg-destructive ring-1 ring-background" />
                )}
              </span>
              <span className="text-[10px] leading-none font-medium">
                {t("nav.alerts")}
              </span>
            </button>
          )}
        />
        <OrgSwitcher variant="tab" side="top" />
        <UserMenu variant="tab" side="top" />
      </nav>
    );
  }

  return (
    <aside
      className={cn(
        "py-2 flex-none flex flex-col bg-secondary/70 dark:bg-secondary/50 h-full border-r gap-2 overflow-hidden transition-[width] duration-200",
        expanded ? "w-55 items-stretch" : "w-12 items-center",
      )}
    >
      <AlertTrayTrigger
        side="right"
        align="start"
        trigger={(count) => (
          <button
            type="button"
            aria-label={t("alerts.tray.trigger")}
            className={cn(
              "flex items-center gap-2 shrink-0 outline-none",
              expanded ? "h-8 mx-2" : "size-8 justify-center",
            )}
          >
            <span className="relative bg-primary grid size-8 shrink-0 place-items-center rounded-lg text-primary-foreground">
              <IconPigFilled className="size-4" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 min-w-3.5 h-3.5 rounded-full bg-destructive px-0.5 text-[9px] font-semibold leading-3.5 text-destructive-foreground ring-2 ring-sidebar">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </span>
            {expanded && (
              <span className="font-bold font-heading text-sm">Mault</span>
            )}
          </button>
        )}
      />
      <Separator />
      <nav
        className={cn(
          "flex flex-col flex-1 gap-1 min-h-0 overflow-y-auto",
          expanded ? "items-stretch" : "items-center",
        )}
      >
        {navItems.map((item) => {
          if (!expanded) {
            if (item.subItems) {
              return (
                <CollapsedNavItemWithSubItems
                  key={item.to}
                  {...item}
                  subItems={item.subItems}
                />
              );
            }
            return <CollapsedNavItem key={item.to} {...item} />;
          }

          return (
            <div key={item.to} className="mx-1">
              <ExpandedNavItem {...item} />
              {item.subItems && item.subItems.length > 0 && (
                <div className="mt-0.5 flex flex-col gap-0.5">
                  {item.subItems.slice(0, 5).map((sub) => (
                    <SubItem
                      key={sub.key}
                      to={sub.to}
                      label={sub.label}
                      badge={sub.badge}
                      onClick={sub.onClick}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <a
        href={DISCORD_URL}
        target="_blank"
        rel="noreferrer"
        title={t("nav.discordAriaLabel")}
        aria-label={t("nav.discordAriaLabel")}
        className={cn(
          buttonVariants({
            variant: "ghost",
            size: `${expanded ? "default" : "icon-lg"}`,
          }),
          expanded ? "mx-2 justify-start gap-2.5 px-2.5 border-0" : "",
        )}
      >
        <IconBrandDiscord size={16} />
        {expanded && (
          <span className="truncate text-sm">{t("nav.discord")}</span>
        )}
      </a>
      <Button
        onClick={toggle}
        className={cn(
          expanded
            ? "mx-2 w-full justify-start gap-2.5 px-2.5 border-0 text-sm"
            : "",
        )}
        size={expanded ? "default" : "icon-lg"}
        variant="ghost"
        title={expanded ? t("nav.collapseSidebar") : t("nav.expandSidebar")}
      >
        {expanded ? (
          <>
            <IconLayoutSidebarLeftCollapse size={16} />
            {t("nav.collapse")}
          </>
        ) : (
          <IconLayoutSidebarLeftExpand size={16} />
        )}
      </Button>
      <Separator />
      <div
        className={cn(
          "flex gap-2",
          expanded ? "flex-row items-center px-2" : "flex-col items-center",
        )}
      >
        <OrgSwitcher side="right" />
        <LanguageSwitcherIcon side="right" />
        <ThemeToggle />
        <UserMenu side="right" />
      </div>
    </aside>
  );
}
