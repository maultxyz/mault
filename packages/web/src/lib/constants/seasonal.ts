import type { SeasonalTheme } from "@/lib/interfaces/seasonal";

export const SEASONAL_THEME_BY_MONTH_INDEX: Partial<Record<number, SeasonalTheme>> = {
  9: "halloween",
  10: "thanksgiving",
  11: "christmas",
};

export const SPIDER_WEB_VIEWBOX = 100;

export const SPIDER_WEB_RADIAL_ANGLES = [0, 18, 36, 54, 72, 90];

export const SPIDER_WEB_RING_RADII = [16, 32, 48, 64, 80, 96];

export const SPIDER_WEB_RING_SAG = 0.84;

export const SEASONAL_CORNER_CLASS = {
  "top-left": "top-0 left-0",
  "top-right": "top-0 right-0 -scale-x-100",
  "bottom-left": "bottom-0 left-0 -scale-y-100",
  "bottom-right": "bottom-0 right-0 -scale-100",
} as const;

export const SPIDER_WEB_DEW_DROPS = [
  { x: 30, y: 9, radius: 1.3 },
  { x: 44, y: 35, radius: 1.1 },
  { x: 12, y: 46, radius: 1.2 },
  { x: 62, y: 21, radius: 0.9 },
] as const;

export const HALLOWEEN_SPIDER = { threadTopX: 58, threadTopY: 36, x: 58, y: 66 } as const;

export const HALLOWEEN_SPIDER_LEG_PATHS = [
  "M-2.5 -1.5Q-8 -7 -11 -3",
  "M-3 0Q-10 -2 -12 2",
  "M-3 1.5Q-9 3 -11 8",
  "M-2.5 3Q-6 7 -8 11",
] as const;

export const HALLOWEEN_BAT_PATH =
  "M0 4C3 0 6 1 7 4C8 2 9 2 10 3C11 2 12 2 13 4C14 1 17 0 20 4C17 4 16 7 14 6C13 8 11 7 10 9C9 7 7 8 6 6C4 7 3 4 0 4Z";

export const HALLOWEEN_COLORS = {
  spiderBodyLight: "#5b3f73",
  spiderBodyDark: "#150d1c",
  spiderLegs: "#6b4a88",
  spiderEyes: "#f97316",
  bat: "#3d2754",
  dew: "#ffffff",
} as const;

export const MAPLE_LEAF_PATH =
  "M0 -10L2 -5.5L5.5 -7.5L4.5 -2.5L9.5 -3.5L7.5 0L10.5 2.5L5 3.2L6.2 6.5L1.2 4.6L0.6 8.5H-0.6L-1.2 4.6L-6.2 6.5L-5 3.2L-10.5 2.5L-7.5 0L-9.5 -3.5L-4.5 -2.5L-5.5 -7.5L-2 -5.5Z";

export const MAPLE_LEAF_VEIN_PATH = "M0 6V-8M0 3.5L7 -1M0 3.5L-7 -1M0 1L4 -5M0 1L-4 -5";

export const THANKSGIVING_LEAF_GRADIENTS = [
  { from: "#fde047", to: "#ea580c" },
  { from: "#fb923c", to: "#b91c1c" },
  { from: "#fbbf24", to: "#c2410c" },
] as const;

export const THANKSGIVING_LEAVES = [
  { x: 20, y: 18, scale: 1.55, rotate: -22, gradient: 0, swayMs: 5200 },
  { x: 48, y: 11, scale: 1.05, rotate: 38, gradient: 1, swayMs: 6100 },
  { x: 13, y: 50, scale: 1.15, rotate: 72, gradient: 2, swayMs: 5700 },
  { x: 42, y: 40, scale: 0.85, rotate: -48, gradient: 1, swayMs: 6600 },
  { x: 70, y: 24, scale: 0.7, rotate: 16, gradient: 0, swayMs: 4900 },
] as const;

export const THANKSGIVING_ACORN = { x: 30, y: 70, rotate: 18 } as const;

export const THANKSGIVING_COLORS = {
  vein: "#7c2d12",
  stem: "#78350f",
  acornNutLight: "#e0a050",
  acornNutDark: "#92400e",
  acornCap: "#5c3a1a",
  acornCapTexture: "#3f2710",
  acornShine: "#ffffff",
} as const;

export const CHRISTMAS_GARLAND_CURVE = {
  start: { x: -4, y: 62 },
  control: { x: 30, y: 30 },
  end: { x: 64, y: -4 },
} as const;

export const CHRISTMAS_GARLAND_NEEDLE_STEPS = 46;

export const CHRISTMAS_GARLAND_NEEDLE_LENGTH = 7.5;

export const CHRISTMAS_ORNAMENTS = [
  { curveT: 0.3, stringLength: 14, radius: 6, color: "#dc2626", swayMs: 4200 },
  { curveT: 0.58, stringLength: 8, radius: 5, color: "#d4a017", swayMs: 5000 },
  { curveT: 0.82, stringLength: 18, radius: 4.5, color: "#1d4ed8", swayMs: 4600 },
] as const;

export const CHRISTMAS_BOW = { curveT: 0.44 } as const;

export const CHRISTMAS_SNOWFLAKES = [
  { x: 58, y: 54, radius: 5, rotate: 10 },
  { x: 80, y: 34, radius: 3.5, rotate: 25 },
  { x: 30, y: 76, radius: 4, rotate: -5 },
] as const;

export const CHRISTMAS_COLORS = {
  needlesDark: "#166534",
  needlesLight: "#22c55e",
  branch: "#3f2a14",
  ornamentCap: "#c8a24a",
  ornamentHighlight: "#ffffff",
  ornamentShadow: "#111827",
  string: "#a8a29e",
  bow: "#dc2626",
  bowShade: "#991b1b",
  snowflake: "#7cb9f0",
} as const;

export const SEASONAL_DECOR_STORAGE_KEY = "magic-vault:seasonal-decor";

export const SEASONAL_DECOR_PREFERENCES = [
  "auto",
  "off",
  "halloween",
  "thanksgiving",
  "christmas",
] as const;

export const DEFAULT_SEASONAL_DECOR_PREFERENCE = "auto";

export const SEASONAL_DECOR_PREFERENCE_LABEL_KEYS = {
  auto: "seasonalDecor.options.auto",
  off: "seasonalDecor.options.off",
  halloween: "seasonalDecor.options.halloween",
  thanksgiving: "seasonalDecor.options.thanksgiving",
  christmas: "seasonalDecor.options.christmas",
} as const;

export const SEASONAL_SWAY_ANIMATION_CLASS =
  "animate-[seasonal-sway_5s_ease-in-out_infinite] motion-reduce:animate-none";
