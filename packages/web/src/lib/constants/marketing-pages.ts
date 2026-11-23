import type { MarketingPageDefinition } from "../interfaces/seo";

export const MARKETING_PAGE_PATHS = {
  home: "/",
  build: "/build",
  selfHost: "/self-host",
  discordBot: "/discord-bot",
  download: "/download",
  privacy: "/privacy",
  terms: "/terms",
} as const;

export const MARKETING_PAGES = [
  {
    path: MARKETING_PAGE_PATHS.home,
    namespace: "landing",
    metaPath: ["meta"],
    openGraphImageKey: "home",
    structuredDataKind: "softwareApplication",
  },
  {
    path: MARKETING_PAGE_PATHS.build,
    namespace: "build",
    metaPath: ["meta"],
    openGraphImageKey: "build",
    structuredDataKind: "howTo",
  },
  {
    path: MARKETING_PAGE_PATHS.selfHost,
    namespace: "selfhost",
    metaPath: ["meta"],
    openGraphImageKey: "selfHost",
    structuredDataKind: "techArticle",
  },
  {
    path: MARKETING_PAGE_PATHS.discordBot,
    namespace: "discord-bot",
    metaPath: ["meta"],
    openGraphImageKey: "discordBot",
    structuredDataKind: "webPage",
  },
  {
    path: MARKETING_PAGE_PATHS.download,
    namespace: "download",
    metaPath: ["meta"],
    openGraphImageKey: "download",
    structuredDataKind: "softwareDownload",
  },
  {
    path: MARKETING_PAGE_PATHS.privacy,
    namespace: "legal",
    metaPath: ["meta", "privacy"],
    openGraphImageKey: "privacy",
    structuredDataKind: "webPage",
  },
  {
    path: MARKETING_PAGE_PATHS.terms,
    namespace: "legal",
    metaPath: ["meta", "terms"],
    openGraphImageKey: "terms",
    structuredDataKind: "webPage",
  },
] as const satisfies readonly MarketingPageDefinition[];

export const MARKETING_HERO_TITLE_CLASS =
  "font-heading text-5xl leading-[1.02] font-semibold tracking-tight text-balance md:text-6xl";

export const MARKETING_INLINE_CODE_CLASS =
  "rounded-sm bg-foreground/6 px-1 py-0.5 font-mono text-sm text-foreground";
