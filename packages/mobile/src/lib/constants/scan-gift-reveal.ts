import type { ScanGiftReveal } from "@magic-vault/shared";

export const SCAN_GIFT_REVEAL_COLORS = {
  wrapping: "#c0283b",
  wrappingShade: "#8f1b2b",
  ribbon: "#f2c14e",
  ribbonShade: "#c99a2e",
} as const;

export const SCAN_GIFT_WRAP_WIGGLE_DEGREES = [-8, 8, -6, 6, -3, 0] as const;
export const SCAN_GIFT_WRAP_RIBBON_WIDTH = 5;
export const SCAN_GIFT_WRAP_HALF_TRAVEL = 28;
export const SCAN_GIFT_WRAP_HALF_ROTATION_DEGREES = 16;
export const SCAN_GIFT_WRAP_BOW_WIDTH = 20;
export const SCAN_GIFT_WRAP_BOW_HEIGHT = 10;
export const SCAN_GIFT_WRAP_BOW_RISE = 12;
export const SCAN_GIFT_WRAP_GLOW_INSET = 3;
export const SCAN_GIFT_WRAP_GLOW_FADE_MS = 300;
export const SCAN_GIFT_WRAP_SPARKLE_MS = 900;
export const SCAN_GIFT_WRAP_SPARKLE_SIZE = 10;

export const SCAN_GIFT_WRAP_SPARKLES = [
  { x: -30, y: -28 },
  { x: 30, y: -30 },
  { x: -36, y: 4 },
  { x: 36, y: 0 },
  { x: -14, y: -40 },
  { x: 16, y: -42 },
] as const;

export const SCAN_GIFT_REVEAL_DEBUG_SAMPLE: Omit<
  ScanGiftReveal,
  "scanId" | "currency"
> = {
  collectionGuid: null,
  cardName: "Lightning Bolt",
  setName: "Magic 2011",
  image: {
    small:
      "https://cards.scryfall.io/small/front/e/3/e3285e6b-3e79-4d7c-bf96-d920f973b122.jpg",
    normal:
      "https://cards.scryfall.io/normal/front/e/3/e3285e6b-3e79-4d7c-bf96-d920f973b122.jpg",
  },
  isFoil: true,
  price: 123.45,
};
