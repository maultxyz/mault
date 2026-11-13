import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { githubStarsQueryOptions } from "@/features/billing/api/github-stars";
import { useCollections } from "@/features/collections/api/use-collections";
import {
  collectionViewPath,
  COLLECTIONS_PATH,
  monitorCollectionPath,
} from "@/lib/constants/collections";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { useRole } from "@/hooks/use-role";
import { DISCORD_URL, REPO_URL, SHOP_URL } from "@/lib/constants/links";
import {
  HOME_PATH,
  NAV_SUBITEMS_LIMIT,
  SIDEBAR_EXPANDED_ITEM_CLASS,
  SIDEBAR_IDLE_ITEM_CLASS,
} from "@/lib/constants/nav";
import { sidebarItemClassName } from "@/lib/sidebar-item";
import { SIDEBAR_EXPANDED_STORAGE_KEY } from "@/lib/constants/storage-keys";
import type { NavItemDef, NavSubItemDef } from "@/lib/interfaces/nav";
import { STORAGE_PATH } from "@/lib/constants/storage";
import { SORTING_RULES_PATH } from "@/lib/constants/bins";
import { STATS_PATH } from "@/lib/constants/stats";
import { ORDERS_PATH } from "@/lib/constants/business";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import { cn } from "@/lib/utils";
import {
  IconAdjustments,
  IconAlbum,
  IconArrowsSplit2,
  IconChartBar,
  IconBrandDiscord,
  IconBrandGithub,
  IconCameraSpark,
  IconCash,
  IconDatabaseCog,
  IconHome,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconSettings,
  IconShoppingCart,
  IconStarFilled,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { PlanLockTag } from "@/components/plan-lock-tag";
import { usePlanLockedPath } from "@/hooks/use-plan-locked-path";
import { useCollectionLocks, useLiveSessionCounts } from "@/lib/app-stream";

function CollapsedNavItem({
  icon,
  label,
  activePaths,
  to,
  end,
  badge,
  disabled,
  tooltip,
  lockTag,
  external,
}: NavItemDef) {
  const { pathname } = useLocation();
  const isAlsoActive = !!activePaths?.some((path) => pathname.startsWith(path));
  const { t } = useTranslation("common");
  const descriptionId = useId();
  const accessibleLabel = [label, lockTag, badge && t("a11y.liveSession")]
    .filter(Boolean)
    .join(", ");
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={accessibleLabel}
        aria-describedby={disabled && tooltip ? descriptionId : undefined}
        render={
          disabled ? (
            <span
              role="link"
              tabIndex={0}
              aria-disabled="true"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-lg" }),
                "cursor-not-allowed text-foreground/40 hover:bg-transparent hover:text-foreground/40",
              )}
            />
          ) : external ? (
            <a
              href={to}
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-lg" }),
                SIDEBAR_IDLE_ITEM_CLASS,
              )}
            />
          ) : (
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                sidebarItemClassName({ isActive: isActive || isAlsoActive, size: "icon-lg" })
              }
            />
          )
        }
      >
        <span className="relative">
          {icon}
          {badge && (
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-success ring-1 ring-sidebar" />
          )}
        </span>
      </TooltipTrigger>
      {disabled && tooltip && (
        <span id={descriptionId} hidden>
          {tooltip}
        </span>
      )}
      <TooltipContent side="right">
        {lockTag ? (
          <span className="flex items-center gap-1.5">
            {label}
            <PlanLockTag label={lockTag} />
          </span>
        ) : disabled ? (
          tooltip
        ) : (
          label
        )}
      </TooltipContent>
    </Tooltip>
  );
}

function CollapsedNavItemWithSubItems({
  activePaths,
  to,
  end,
  icon,
  label,
  subItems,
}: NavItemDef & { subItems: NavSubItemDef[] }) {
  const { pathname } = useLocation();
  const isAlsoActive = !!activePaths?.some((path) => pathname.startsWith(path));
  const { t } = useTranslation("collections");
  const { t: tCommon } = useTranslation("common");
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        openOnHover
        delay={150}
        closeDelay={100}
        render={
          <NavLink
            to={to}
            end={end}
            className={({ isActive }) =>
              sidebarItemClassName({ isActive: isActive || isAlsoActive, size: "icon-lg" })
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
            subItems.slice(0, NAV_SUBITEMS_LIMIT).map((sub) => (
              <DropdownMenuItem
                key={sub.key}
                onClick={() => {
                  sub.onClick?.();
                  navigate(sub.to);
                }}
              >
                <span className="flex-1 truncate">{sub.label}</span>
                {sub.badge && (
                  <>
                    <span className="shrink-0 size-1.5 rounded-full bg-success" />
                    <span className="sr-only">{tCommon("a11y.liveSession")}</span>
                  </>
                )}
              </DropdownMenuItem>
            ))
          ) : (
            <p className="px-2 py-1.5 text-xs text-foreground/70">
              {t("noCollectionsYet")}
            </p>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ExpandedNavItem({
  activePaths,
  to,
  icon,
  label,
  end,
  badge,
  disabled,
  tooltip,
  lockTag,
  external,
}: NavItemDef) {
  const { pathname } = useLocation();
  const isAlsoActive = !!activePaths?.some((path) => pathname.startsWith(path));
  const { t } = useTranslation("common");
  const descriptionId = useId();
  const inner = (
    <>
      <span className="relative shrink-0">
        {icon}
        {badge && (
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-success ring-1 ring-sidebar" />
        )}
      </span>
      <span className="truncate">{label}</span>
      {badge && <span className="sr-only">{t("a11y.liveSession")}</span>}
      {lockTag && <PlanLockTag label={lockTag} className="ml-auto" />}
    </>
  );

  if (disabled) {
    return (
      <Tooltip>
        <TooltipTrigger
          aria-describedby={tooltip ? descriptionId : undefined}
          render={
            <span
              role="link"
              tabIndex={0}
              aria-disabled="true"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                SIDEBAR_EXPANDED_ITEM_CLASS,
                "cursor-not-allowed text-foreground/40 hover:bg-transparent hover:text-foreground/40",
              )}
            />
          }
        >
          {inner}
        </TooltipTrigger>
        {tooltip && (
          <span id={descriptionId} hidden>
            {tooltip}
          </span>
        )}
        <TooltipContent side="right">{tooltip}</TooltipContent>
      </Tooltip>
    );
  }

  if (external) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noreferrer"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          SIDEBAR_IDLE_ITEM_CLASS,
          SIDEBAR_EXPANDED_ITEM_CLASS,
        )}
      >
        {inner}
      </a>
    );
  }

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(sidebarItemClassName({ isActive: isActive || isAlsoActive }), SIDEBAR_EXPANDED_ITEM_CLASS)
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
  const { t } = useTranslation("common");
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2 pl-9 pr-2 py-1 rounded-lg text-xs transition-colors",
          isActive
            ? "bg-sidebar-selected font-medium text-primary"
            : "text-sidebar-foreground hover:bg-sidebar-accent",
        )
      }
    >
      <span className="truncate flex-1">{label}</span>
      {badge && (
        <>
          <span className="shrink-0 size-1.5 rounded-full bg-success" />
          <span className="sr-only">{t("a11y.liveSession")}</span>
        </>
      )}
    </NavLink>
  );
}

export function AppNav() {
  const { t, i18n } = useTranslation("common");
  const { data: githubStars } = useQuery(githubStarsQueryOptions(true));
  const formattedStars =
    githubStars != null
      ? new Intl.NumberFormat(i18n.language, { notation: "compact" }).format(
          githubStars,
        )
      : null;
  const githubLabel =
    githubStars != null
      ? `${t("nav.githubAriaLabel")} (${t("nav.githubStars", { count: githubStars })})`
      : t("nav.githubAriaLabel");
  const { isStaff } = useRole();
  const { planLockFor } = usePlanLockedPath();
  const planGated = (path: string) => {
    const lock = planLockFor(path);
    return lock
      ? { disabled: lock.isDisabled, lockTag: lock.tag, tooltip: lock.tag }
      : {};
  };
  const { collections, activeCollection } = useCollections();
  const { locks, currentUserId } = useCollectionLocks();

  const [expanded, setExpanded] = useState(
    () => localStorage.getItem(SIDEBAR_EXPANDED_STORAGE_KEY) === "true",
  );

  const toggle = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_EXPANDED_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  useHotkeys({ toggleSidebar: toggle });

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
      to: HOME_PATH,
      icon: <IconHome size={16} />,
      label: t("nav.home"),
    },
    {
      to: "/app",
      icon: <IconCameraSpark size={16} />,
      label: t("nav.scanner"),
      end: true,
    },
    {
      to: COLLECTIONS_PATH,
      activePaths: [STORAGE_PATH],
      icon: <IconAlbum size={16} />,
      label: t("nav.library"),
      badge: hasLiveSessions,
      subItems: monitorCollections.map((c) => ({
        key: c.guid,
        to: locks[c.guid]
          ? monitorCollectionPath(c.guid)
          : c.guid === activeCollection?.guid
            ? "/app"
            : collectionViewPath(c.guid),
        label: c.name,
        badge: !!locks[c.guid],
      })),
    },
    {
      to: SORTING_RULES_PATH,
      icon: <IconArrowsSplit2 size={16} />,
      label: t("nav.sortingRules"),
    },
    {
      to: STATS_PATH,
      icon: <IconChartBar size={16} />,
      label: t("nav.stats"),
    },
    {
      to: ORDERS_PATH,
      icon: <IconCash size={16} />,
      label: t("nav.intake"),
      ...planGated(ORDERS_PATH),
    },


    {
      to: "/app/calibrate",
      icon: <IconAdjustments size={16} />,
      label: t("nav.calibrate"),
    },
    {
      to: SETTINGS_PATHS.root,
      icon: <IconSettings size={16} />,
      label: t("nav.settings"),
    },
    ...(isStaff
      ? [
          {
            to: "/app/admin",
            icon: <IconDatabaseCog size={16} />,
            label: t("nav.admin"),
          },
        ]
      : []),
  ];

  return (
    <aside
      className={cn(
        "pt-8 pb-2 flex-none flex flex-col h-full gap-0.5 overflow-hidden transition-[width] duration-200",
        expanded ? "w-52 items-stretch" : "w-10 items-center",
      )}
    >
      <nav
        aria-label={t("a11y.mainNavigation")}
        className={cn(
          "flex flex-col flex-1 gap-0.5 min-h-0 overflow-y-auto",
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
                  {item.subItems.slice(0, NAV_SUBITEMS_LIMIT).map((sub) => (
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
        href={SHOP_URL}
        target="_blank"
        rel="noreferrer"
        title={t("nav.cart")}
        aria-label={t("nav.cart")}
        className={cn(
          buttonVariants({
            variant: "ghost",
            size: `${expanded ? "default" : "icon-lg"}`,
          }),
          SIDEBAR_IDLE_ITEM_CLASS,
          expanded && "mx-2 justify-start gap-2.5 px-2.5 border-0",
        )}
      >
        <IconShoppingCart size={16} />
        {expanded && (
          <span className="truncate">{t("nav.cart")}</span>
        )}
      </a>
      <a
        href={REPO_URL}
        target="_blank"
        rel="noreferrer"
        title={githubLabel}
        aria-label={githubLabel}
        className={cn(
          buttonVariants({
            variant: "ghost",
            size: `${expanded ? "default" : "icon-lg"}`,
          }),
          SIDEBAR_IDLE_ITEM_CLASS,
          expanded && "mx-2 justify-start gap-2.5 px-2.5 border-0",
        )}
      >
        <IconBrandGithub size={16} />
        {expanded && (
          <>
            <span className="truncate">{t("nav.github")}</span>
            {githubStars != null && (
              <span className="ml-auto inline-flex items-center gap-0.5 rounded-full border bg-muted px-1.5 text-2xs text-foreground/80">
                <IconStarFilled className="size-3 text-warning" />
                {formattedStars}
              </span>
            )}
          </>
        )}
      </a>
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
          SIDEBAR_IDLE_ITEM_CLASS,
          expanded && "mx-2 justify-start gap-2.5 px-2.5 border-0",
        )}
      >
        <IconBrandDiscord size={16} />
        {expanded && (
          <span className="truncate">{t("nav.discord")}</span>
        )}
      </a>
      <Button
        onClick={toggle}
        className={cn(
          SIDEBAR_IDLE_ITEM_CLASS,
          expanded && "mx-2 justify-start gap-2.5 px-2.5 border-0",
        )}
        size={expanded ? "default" : "icon-lg"}
        variant="ghost"
        aria-expanded={expanded}
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
    </aside>
  );
}
