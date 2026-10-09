import { STATS_PATH } from "@/lib/constants/stats";
import { SHOP_URL } from "@/lib/constants/links";

export const NAV_SUBITEMS_LIMIT = 5;

export const WATCH_ROUTE_PREFIX = "/watch";
export const WATCH_TOKEN_PARAM = "t";

export const MOBILE_NAV_TAB_CLASS =
  "flex h-14 flex-col items-center justify-center gap-0.5 text-2xs leading-tight font-medium transition-colors active:bg-muted data-[state=open]:text-primary dark:data-[state=open]:text-sidebar-primary";
export const MOBILE_NAV_SPACE_CLASS =
  "[--mobile-nav-space:calc(3.5rem+1px+env(safe-area-inset-bottom))]";
export const MOBILE_NAV_SCROLL_PADDING_CLASS =
  "pb-[var(--mobile-nav-space,0px)]";
export const MOBILE_NAV_TAB_ACTIVE_CLASS =
  "text-primary font-semibold dark:text-sidebar-primary";
export const MOBILE_HEADER_CLASS = "shrink-0 text-primary-foreground";
export const MOBILE_PLAIN_HEADER_CLASS =
  "flex shrink-0 flex-col gap-3 bg-background px-5 pt-3 pb-3 text-foreground";
export const MOBILE_BRAND_SHELL_PATTERN = /^\/app\/monitor(\/|$)/;
export const MOBILE_HEADER_BODY_CLASS =
  "flex flex-col gap-3 bg-linear-to-b from-primary to-primary/80 px-5 pt-3 pb-2";
export const MOBILE_HEADER_FADE_CLASS =
  "pointer-events-none -mb-8 h-16 bg-linear-to-b from-primary/80 to-primary/0";
export const MOBILE_HEADER_BUTTON_CLASS =
  "-ml-2 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground active:bg-primary-foreground/15";
export const MOBILE_HEADER_SEARCH_CLASS =
  "border-transparent bg-background shadow-xs dark:bg-background";
export const MOBILE_LIST_CLASS = "-mx-2 flex flex-col";
export const MOBILE_LIST_ROW_CLASS =
  "flex min-h-11 w-full items-center gap-3.5 rounded-md px-2 py-1.5 text-left text-sm text-foreground transition-colors active:bg-muted";
export const MOBILE_ICON_TILE_CLASS =
  "flex size-5 shrink-0 items-center justify-center text-foreground/70";
export const MOBILE_SECTION_LABEL_CLASS = "text-xs text-foreground/70";
export const MOBILE_SECTION_CLASS = "flex flex-col gap-1";
export const MOBILE_SEARCH_INPUT_CLASS =
  "h-9 rounded-lg border-transparent bg-muted pl-9 dark:bg-muted";
export const MOBILE_ICON_BUTTON_CLASS = "size-9";
export const THEME_OPTIONS = ["light", "dark", "system"] as const;
export const MOBILE_MORE_PATHS = ["/app/account", "/app/health", STATS_PATH];
export const MOBILE_SCAN_PATH = "/app/scan";
export const MOBILE_NAV_HIDDEN_PATTERN = /^\/app\/monitor\/[^/]+\/camera\/?$/;

export const PUBLIC_NAV_PAGES = [
  { key: "home", to: "/" },
  { key: "build", to: "/build" },
  { key: "discordBot", to: "/discord-bot" },
  { key: "shop", to: SHOP_URL, external: true },
] as const;
