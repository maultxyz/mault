import type {
  MarketingOpenGraphPage,
  OpenGraphTheme,
} from "../interfaces/open-graph.interface";

export const OPEN_GRAPH_IMAGE_ROUTE_PATH = "/og-image";
export const OPEN_GRAPH_IMAGE_PAGES_SEGMENT = "pages";
export const OPEN_GRAPH_IMAGE_FILE_EXTENSION = ".jpg";
export const OPEN_GRAPH_IMAGE_CONTENT_TYPE = "image/jpeg";
export const OPEN_GRAPH_IMAGE_WIDTH = 1200;
export const OPEN_GRAPH_IMAGE_HEIGHT = 630;
export const OPEN_GRAPH_IMAGE_VERSION_PARAM = "v";
export const OPEN_GRAPH_IMAGE_THEME_PARAM = "theme";
export const OPEN_GRAPH_THEMES = ["light", "dark"] as const;
export const OPEN_GRAPH_DEFAULT_THEME: OpenGraphTheme = "light";
export const OPEN_GRAPH_SORTER_PHOTO_ALT =
  "Photo of two Mault trading card sorters, one black and one pink, with cards in their bins";

export const OPEN_GRAPH_STAT_ICONS = [
  "cards",
  "games",
  "tradeOffers",
  "storageBox",
  "shop",
  "condition",
  "foil",
  "price",
  "openSource",
  "printer",
  "board",
  "docker",
  "cloud",
  "discord",
  "alerts",
  "stats",
  "windows",
  "linux",
  "updates",
  "company",
  "email",
  "privacy",
] as const;

export const MARKETING_OPEN_GRAPH_PAGES = {
  home: {
    eyebrow: "Automated card sorter",
    headline: "Every card, right where it belongs.",
    subtitle: "Scan, sort and track the value of Magic, Pokémon and more.",
    stats: [
      { icon: "games", text: "12 card games" },
      { icon: "openSource", text: "Open source" },
    ],
  },
  build: {
    eyebrow: "Hardware build guide",
    headline: "Build your own card sorting machine",
    subtitle: "Parts list, wiring, 3D printed parts and step-by-step assembly.",
    stats: [
      { icon: "printer", text: "3D printed" },
      { icon: "board", text: "ESP32 or Arduino" },
    ],
  },
  selfHost: {
    eyebrow: "Self-hosting guide",
    headline: "Run Mault on your own server",
    subtitle: "Pick your setup and follow only the steps you need.",
    stats: [
      { icon: "docker", text: "Docker" },
      { icon: "cloud", text: "Coolify" },
      { icon: "board", text: "Raspberry Pi" },
    ],
  },
  discordBot: {
    eyebrow: "Discord bot",
    headline: "Every sorted card, posted to Discord",
    subtitle: "Bring your card sorter into your Discord server.",
    stats: [
      { icon: "cards", text: "Scan posts" },
      { icon: "alerts", text: "Sorter alerts" },
      { icon: "stats", text: "/stats" },
    ],
  },
  download: {
    eyebrow: "Desktop app",
    headline: "Keep sorting while you do something else",
    subtitle: "Scanning keeps running in the background, with a floating preview.",
    stats: [
      { icon: "windows", text: "Windows" },
      { icon: "linux", text: "Linux" },
      { icon: "updates", text: "Auto updates" },
    ],
  },
  privacy: {
    eyebrow: "Legal",
    headline: "Privacy Policy",
    subtitle: "How Mault LLC collects, uses and protects your information.",
    stats: [
      { icon: "privacy", text: "Your data" },
      { icon: "email", text: "support@mault.xyz" },
    ],
  },
  terms: {
    eyebrow: "Legal",
    headline: "Terms of Service",
    subtitle: "The terms for using the hosted Mault card sorting service.",
    stats: [
      { icon: "company", text: "Mault LLC" },
      { icon: "email", text: "support@mault.xyz" },
    ],
  },
} as const satisfies Record<string, MarketingOpenGraphPage>;
