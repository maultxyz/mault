import { DOWNLOAD_PATH } from "@/lib/constants/download";
import { SELF_HOST_PATH } from "@/lib/constants/self-host";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import { STATS_PATH } from "@/lib/constants/stats";
import { ORDERS_PATH } from "@/lib/constants/business";
import { SHOP_URL } from "@/lib/constants/links";

export const NAV_SUBITEMS_LIMIT = 5;

export const SIDEBAR_IDLE_ITEM_CLASS =
  "text-sidebar-foreground hover:bg-sidebar-accent dark:hover:bg-sidebar-accent aria-expanded:bg-sidebar-accent";
export const PAGE_TITLE_CLASS =
  "font-heading text-base font-semibold tracking-tight text-foreground";
export const SIDEBAR_SELECTED_ITEM_CLASS =
  "bg-sidebar-selected text-primary hover:bg-sidebar-selected hover:text-primary dark:hover:bg-sidebar-selected aria-expanded:bg-sidebar-selected aria-expanded:text-primary";
export const SIDEBAR_EXPANDED_ITEM_CLASS =
  "w-full justify-start gap-2 px-2 border-0";

export const WATCH_ROUTE_PREFIX = "/watch";
export const WATCH_TOKEN_PARAM = "t";

export const MOBILE_NAV_TAB_CLASS =
  "flex h-14 flex-col items-center justify-center gap-0.5 text-2xs leading-tight font-medium transition-colors active:bg-sidebar-accent";
export const MOBILE_NAV_SPACE_CLASS =
  "[--mobile-nav-space:calc(3.5rem+1px+env(safe-area-inset-bottom))]";
export const MOBILE_NAV_SCROLL_PADDING_CLASS =
  "pb-[var(--mobile-nav-space,0px)]";
export const MOBILE_SAVE_BAR_CLASS =
  "bottom-[calc(3.5rem+1px+env(safe-area-inset-bottom)+0.5rem)]";
export const MOBILE_NAV_TAB_ACTIVE_CLASS = "text-primary font-semibold";
export const MOBILE_NAV_TAB_ICON_ACTIVE_CLASS = "bg-sidebar-selected";
export const MOBILE_FRAMED_SHELL_CLASS = "pb-[var(--mobile-nav-space,0px)]";
export const MOBILE_FRAMED_PANEL_CLASS =
  "mx-1.5 rounded-lg border bg-background/70 shadow-xs dark:bg-background/60 [--mobile-nav-space:0px]";
export const MOBILE_PLAIN_HEADER_CLASS =
  "flex shrink-0 flex-col gap-2.5 border-b px-4 pt-2.5 pb-2.5 text-foreground";
export const SCROLL_COLLAPSE_AT = 48;
export const SCROLL_EXPAND_AT = 4;
export const SCROLL_COLLAPSE_MIN_OVERFLOW = 160;
export const MOBILE_PAGE_TITLE_CLASS =
  "font-heading text-lg font-semibold leading-tight tracking-tight text-foreground";
export const MOBILE_PAGE_BODY_CLASS = "flex w-full flex-col gap-5 px-4 pt-4 pb-6";
export const MOBILE_LIST_CLASS = "flex shrink-0 flex-col divide-y divide-border";
export const MOBILE_LIST_ROW_CLASS =
  "flex min-h-12 w-full items-center gap-3 py-2 text-left text-sm font-medium text-foreground transition-colors active:bg-muted";
export const MOBILE_ICON_TILE_CLASS =
  "flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground [&_svg]:size-4";
export const MOBILE_SECTION_LABEL_CLASS =
  "font-heading text-sm leading-tight font-semibold text-foreground";
export const MOBILE_SECTION_CLASS = "flex flex-col gap-2";
export const MOBILE_SEARCH_INPUT_CLASS =
  "h-11 rounded-lg pl-10 text-base";
export const MOBILE_ICON_BUTTON_CLASS =
  "size-10 shrink-0 rounded-lg border-border bg-background text-foreground hover:bg-background active:bg-muted dark:bg-input/30 dark:hover:bg-input/30 aria-expanded:bg-muted [&_svg:not([class*='size-'])]:size-5";
export const MOBILE_CIRCLE_BUTTON_CLASS =
  "size-10 rounded-lg border-border bg-background text-foreground hover:bg-background active:bg-muted dark:bg-input/30 dark:hover:bg-input/30 [&_svg:not([class*='size-'])]:size-5";
export const MOBILE_PRIMARY_CIRCLE_BUTTON_CLASS =
  "size-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary active:bg-primary-hover [&_svg:not([class*='size-'])]:size-5";
export const MOBILE_PILL_BUTTON_CLASS =
  "h-11 gap-2 rounded-lg px-5 text-sm font-semibold [&_svg:not([class*='size-'])]:size-4";
export const MOBILE_PILL_BUTTON_SM_CLASS =
  "h-9 gap-1.5 rounded-lg px-4 text-sm font-semibold [&_svg:not([class*='size-'])]:size-4";
export const MOBILE_FILTER_CHIP_CLASS =
  "h-9 shrink-0 gap-1.5 rounded-lg px-3.5 text-sm font-medium [&_svg:not([class*='size-'])]:size-4";
export const MOBILE_FILTER_CHIP_ACTIVE_CLASS =
  "border-primary/40 bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary dark:bg-primary/20 dark:hover:bg-primary/20";
export const MOBILE_FILTER_CHIP_IDLE_CLASS =
  "border-border bg-background text-foreground hover:bg-background active:bg-muted dark:bg-input/30 dark:hover:bg-input/30";
export const MOBILE_CARD_CLASS = "overflow-hidden rounded-lg bg-card ring-1 ring-border";
export const MOBILE_HERO_LABEL_CLASS = "text-xs font-medium text-foreground/70";
export const MOBILE_HERO_VALUE_CLASS =
  "truncate font-heading text-3xl leading-tight font-semibold tracking-tight tabular-nums text-foreground";
export const THEME_OPTIONS = ["light", "dark", "system"] as const;
export const MOBILE_HOME_PATH = "/app/monitor";
export const MOBILE_SCAN_PATH = "/app/scan";
export const MOBILE_SCAN_PAIR_PATH = "/app/scan/pair";
export const MOBILE_SORTER_PATH = "/app/sorter";
export const MOBILE_ACCOUNT_PATH = "/app/me";
export const MOBILE_ACCOUNT_TAB_PATHS = [
  MOBILE_ACCOUNT_PATH,
  "/app/account",
  "/app/health",
  SETTINGS_PATHS.root,
  STATS_PATH,
  ORDERS_PATH,
];
export const MOBILE_NAV_HIDDEN_PATTERN = /^\/app\/monitor\/[^/]+\/camera\/?$/;
export const MOBILE_IMMERSIVE_PATTERN = /^\/app\/scan\/?$/;
export const MOBILE_IMMERSIVE_PANEL_CLASS = "bg-black dark:bg-black";

export const PUBLIC_NAV_PAGES = [
  { key: "home", to: "/" },
  { key: "build", to: "/build" },
  { key: "selfHost", to: SELF_HOST_PATH },
  { key: "discordBot", to: "/discord-bot" },
  { key: "download", to: DOWNLOAD_PATH },
  { key: "shop", to: SHOP_URL, external: true },
] as const;
