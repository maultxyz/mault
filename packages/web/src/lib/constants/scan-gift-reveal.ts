import {
  SCAN_GIFT_REVEAL_UNWRAP_MS,
  SCAN_GIFT_REVEAL_WIGGLE_MS,
} from "@magic-vault/shared";

export const SCAN_GIFT_REVEAL_DEBUG_PRICE = 123.45;

export const SCAN_GIFT_REVEAL_COLORS = {
  wrapping: "#c0283b",
  wrappingShade: "#8f1b2b",
  ribbon: "#f2c14e",
  ribbonShade: "#c99a2e",
} as const;

export const SCAN_GIFT_WRAP_PAPER_BACKGROUND = `repeating-linear-gradient(135deg, ${SCAN_GIFT_REVEAL_COLORS.wrapping} 0 10px, ${SCAN_GIFT_REVEAL_COLORS.wrappingShade} 10px 14px)`;

export const SCAN_GIFT_WRAP_ANIMATIONS = {
  wiggle: `gift-shake ${SCAN_GIFT_REVEAL_WIGGLE_MS}ms ease-in-out both`,
  paperLeft: `gift-paper-left ${SCAN_GIFT_REVEAL_UNWRAP_MS}ms cubic-bezier(0.5, 0, 0.75, 0) both`,
  paperRight: `gift-paper-right ${SCAN_GIFT_REVEAL_UNWRAP_MS}ms cubic-bezier(0.5, 0, 0.75, 0) both`,
  bowPop: `gift-bow-pop ${Math.round(SCAN_GIFT_REVEAL_UNWRAP_MS * 0.6)}ms ease-out both`,
  glow: "gift-glow 1600ms ease-in-out infinite",
  tag: "gift-tag-in 450ms cubic-bezier(0.22, 1.4, 0.36, 1) both",
} as const;

export const SCAN_GIFT_WRAP_VARIANT_CLASSES = {
  tile: {
    verticalRibbon: "w-[7%]",
    horizontalRibbon: "h-[10%]",
    bow: "size-[30%]",
    bowLoopBorder: "border-[5px]",
    glowInset: "18px",
  },
  thumbnail: {
    verticalRibbon: "w-[14%]",
    horizontalRibbon: "h-[12%]",
    bow: "size-[45%]",
    bowLoopBorder: "border-2",
    glowInset: "6px",
  },
} as const;

export const SCAN_GIFT_REVEAL_SPARKLES = [
  { x: -70, y: -80, delayMs: 0 },
  { x: 70, y: -85, delayMs: 60 },
  { x: -85, y: 10, delayMs: 110 },
  { x: 85, y: 0, delayMs: 30 },
  { x: -40, y: -110, delayMs: 140 },
  { x: 45, y: -112, delayMs: 80 },
] as const;
