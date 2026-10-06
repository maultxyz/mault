import { SHOP_URL } from "@/lib/constants/links";

export const NAV_SUBITEMS_LIMIT = 5;

export const WATCH_ROUTE_PREFIX = "/watch";
export const WATCH_TOKEN_PARAM = "t";

export const MOBILE_NAV_TAB_CLASS =
  "flex h-11 flex-col items-center justify-center rounded-xl text-[10px] leading-tight font-medium transition-colors active:bg-secondary active:text-secondary-foreground data-[state=open]:bg-secondary data-[state=open]:text-secondary-foreground";
export const MOBILE_NAV_SPACE_CLASS =
  "[--mobile-nav-space:calc(4.5rem+env(safe-area-inset-bottom))]";
export const MOBILE_NAV_SCROLL_PADDING_CLASS =
  "pb-[var(--mobile-nav-space,0px)]";
export const MOBILE_NAV_TAB_ACTIVE_CLASS =
  "bg-secondary text-secondary-foreground";
export const THEME_OPTIONS = ["light", "dark", "system"] as const;
export const MOBILE_MORE_PATHS = ["/app/account", "/app/health"];
export const MOBILE_NAV_HIDDEN_PATTERN = /^\/app\/monitor\/[^/]+\/camera\/?$/;

export const PUBLIC_NAV_PAGES = [
  { key: "home", to: "/" },
  { key: "build", to: "/build" },
  { key: "discordBot", to: "/discord-bot" },
  { key: "shop", to: SHOP_URL, external: true },
] as const;
