import { withNamespaces } from "@/lib/i18n";
import { MARKETING_PAGE_PATHS } from "@/lib/constants/marketing-pages";
import type { MarketingPageModule } from "@/lib/interfaces/seo";
import { lazy } from "react";

export const MARKETING_PAGE_MODULES: Record<
  string,
  { load: () => Promise<MarketingPageModule>; namespaces: string[] }
> = {
  [MARKETING_PAGE_PATHS.home]: {
    load: () => import("@/app/routes/index"),
    namespaces: ["common", "landing", "bins", "storage"],
  },
  [MARKETING_PAGE_PATHS.build]: {
    load: () => import("@/app/routes/build"),
    namespaces: ["common", "build"],
  },
  [MARKETING_PAGE_PATHS.selfHost]: {
    load: () => import("@/app/routes/self-host"),
    namespaces: ["common", "selfhost"],
  },
  [MARKETING_PAGE_PATHS.discordBot]: {
    load: () => import("@/app/routes/discord-bot"),
    namespaces: ["common", "discordBot"],
  },
  [MARKETING_PAGE_PATHS.download]: {
    load: () => import("@/app/routes/download"),
    namespaces: ["common", "download"],
  },
  [MARKETING_PAGE_PATHS.privacy]: {
    load: () => import("@/app/routes/privacy"),
    namespaces: ["common", "legal"],
  },
  [MARKETING_PAGE_PATHS.terms]: {
    load: () => import("@/app/routes/terms"),
    namespaces: ["common", "legal"],
  },
};

export function loadMarketingPage(path: string): Promise<MarketingPageModule> {
  const page = MARKETING_PAGE_MODULES[path];
  if (!page) throw new Error(`No marketing page for ${path}`);
  return withNamespaces(page.load, page.namespaces)();
}

export const LAZY_MARKETING_PAGES = Object.fromEntries(
  Object.keys(MARKETING_PAGE_MODULES).map((path) => [
    path,
    lazy(() => loadMarketingPage(path)),
  ]),
);
