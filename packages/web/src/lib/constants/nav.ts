import { DOWNLOAD_PATH } from "@/lib/constants/download";
import { SELF_HOST_PATH } from "@/lib/constants/self-host";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import { STATS_PATH } from "@/lib/constants/stats";
import { SHOP_URL } from "@/lib/constants/links";

export const NAV_SUBITEMS_LIMIT = 5;

export const WATCH_ROUTE_PREFIX = "/watch";
export const WATCH_TOKEN_PARAM = "t";

export const MOBILE_NAV_TAB_CLASS =
  "flex h-14 flex-col items-center justify-center gap-0.5 text-2xs leading-tight font-medium transition-colors active:bg-muted";
export const MOBILE_NAV_SPACE_CLASS =
  "[--mobile-nav-space:calc(3.5rem+1px+env(safe-area-inset-bottom))]";
export const MOBILE_NAV_SCROLL_PADDING_CLASS =
  "pb-[var(--mobile-nav-space,0px)]";
export const MOBILE_NAV_TAB_ACTIVE_CLASS = "text-foreground font-semibold";
export const MOBILE_PLAIN_HEADER_CLASS =
  "flex shrink-0 flex-col gap-4 px-5 pt-3 pb-4 text-foreground";
export const SCROLL_COLLAPSE_AT = 48;
export const SCROLL_EXPAND_AT = 4;
export const SCROLL_COLLAPSE_MIN_OVERFLOW = 160;
export const MOBILE_PAGE_TITLE_CLASS =
  "font-heading font-bold leading-tight tracking-tight text-foreground";
export const MOBILE_PAGE_BODY_CLASS = "flex w-full flex-col gap-7 px-5 pt-1 pb-6";
export const MOBILE_LIST_CLASS = "-mx-2 flex flex-col";
export const MOBILE_LIST_ROW_CLASS =
  "flex min-h-14 w-full items-center gap-3 rounded-md px-2 py-2 text-left text-base font-medium text-foreground transition-colors active:bg-muted";
export const MOBILE_ICON_TILE_CLASS =
  "flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground [&_svg]:size-5";
export const MOBILE_SECTION_LABEL_CLASS =
  "font-heading text-lg leading-tight font-bold text-foreground";
export const MOBILE_SECTION_CLASS = "flex flex-col gap-2";
export const MOBILE_SEARCH_INPUT_CLASS =
  "h-11 rounded-full border-transparent bg-muted pl-10 text-base dark:bg-muted";
export const MOBILE_ICON_BUTTON_CLASS =
  "size-10 shrink-0 rounded-full border-transparent bg-muted text-foreground hover:bg-muted active:bg-border dark:bg-muted dark:hover:bg-muted aria-expanded:bg-border [&_svg:not([class*='size-'])]:size-5";
export const MOBILE_CIRCLE_BUTTON_CLASS =
  "size-10 rounded-full bg-muted text-foreground hover:bg-muted active:bg-border dark:hover:bg-muted [&_svg:not([class*='size-'])]:size-5";
export const MOBILE_PRIMARY_CIRCLE_BUTTON_CLASS =
  "size-10 rounded-full bg-primary text-primary-foreground hover:bg-primary active:bg-primary/85 [&_svg:not([class*='size-'])]:size-5";
export const MOBILE_PILL_BUTTON_CLASS =
  "h-11 gap-2 rounded-full px-5 text-sm font-semibold [&_svg:not([class*='size-'])]:size-4";
export const MOBILE_PILL_BUTTON_SM_CLASS =
  "h-9 gap-1.5 rounded-full px-4 text-sm font-semibold [&_svg:not([class*='size-'])]:size-4";
export const MOBILE_FILTER_CHIP_CLASS =
  "h-9 shrink-0 gap-1.5 rounded-full border-transparent px-4 text-sm font-semibold [&_svg:not([class*='size-'])]:size-4";
export const MOBILE_FILTER_CHIP_ACTIVE_CLASS =
  "bg-foreground text-background hover:bg-foreground hover:text-background dark:hover:bg-foreground";
export const MOBILE_FILTER_CHIP_IDLE_CLASS =
  "bg-muted text-foreground hover:bg-muted dark:bg-muted dark:hover:bg-muted";
export const MOBILE_CARD_CLASS = "overflow-hidden rounded-lg bg-muted";
export const MOBILE_HERO_LABEL_CLASS = "text-sm font-medium text-foreground/70";
export const MOBILE_HERO_VALUE_CLASS =
  "truncate font-heading text-4xl leading-tight font-bold tracking-tight tabular-nums text-foreground";
export const MOBILE_CHIP_CLASS =
  "inline-flex max-w-full items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground";
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
];
export const MOBILE_NAV_HIDDEN_PATTERN = /^\/app\/monitor\/[^/]+\/camera\/?$/;
export const MOBILE_IMMERSIVE_PATTERN = /^\/app\/scan\/?$/;

export const PUBLIC_NAV_PAGES = [
  { key: "home", to: "/" },
  { key: "build", to: "/build" },
  { key: "selfHost", to: SELF_HOST_PATH },
  { key: "discordBot", to: "/discord-bot" },
  { key: "download", to: DOWNLOAD_PATH },
  { key: "shop", to: SHOP_URL, external: true },
] as const;
