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
  { path: MARKETING_PAGE_PATHS.home, namespace: "landing", metaPath: ["meta"] },
  { path: MARKETING_PAGE_PATHS.build, namespace: "build", metaPath: ["meta"] },
  {
    path: MARKETING_PAGE_PATHS.selfHost,
    namespace: "selfhost",
    metaPath: ["meta"],
  },
  {
    path: MARKETING_PAGE_PATHS.discordBot,
    namespace: "discord-bot",
    metaPath: ["meta"],
  },
  {
    path: MARKETING_PAGE_PATHS.download,
    namespace: "download",
    metaPath: ["meta"],
  },
  {
    path: MARKETING_PAGE_PATHS.privacy,
    namespace: "legal",
    metaPath: ["meta", "privacy"],
  },
  {
    path: MARKETING_PAGE_PATHS.terms,
    namespace: "legal",
    metaPath: ["meta", "terms"],
  },
] as const;

export const MARKETING_HERO_TITLE_CLASS =
  "font-heading text-5xl leading-[1.02] font-semibold tracking-tight text-balance md:text-6xl";

export const MARKETING_INLINE_CODE_CLASS =
  "rounded-sm bg-foreground/6 px-1 py-0.5 font-mono text-sm text-foreground";
