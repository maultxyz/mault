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
