import type { LoadingLogoKeyframe, LoadingLogoLayer } from "@/lib/interfaces/loading";

export const LOADING_LOGO_CYCLE_MS = 1800;
export const LOADING_LOGO_VIEW_BOX_WIDTH = 235;
export const LOADING_LOGO_VIEW_BOX_HEIGHT = 217;
export const LOADING_LOGO_DEFAULT_SIZE = 40;
export const LOADING_LOGO_INLINE_SIZE = 18;

const LOADING_LOGO_HOP_KEYFRAMES: LoadingLogoKeyframe[] = [
  { at: 0, translateY: 0, rotate: 0, scaleX: 1, scaleY: 1 },
  { at: 0.08, translateY: 0, rotate: 0, scaleX: 1.1, scaleY: 0.85 },
  { at: 0.2, translateY: -0.3, rotate: -4, scaleX: 0.9, scaleY: 1.12 },
  { at: 0.3, translateY: -0.36, rotate: 3, scaleX: 1, scaleY: 1 },
  { at: 0.4, translateY: 0, rotate: 0, scaleX: 1.14, scaleY: 0.82 },
  { at: 0.48, translateY: 0, rotate: 0, scaleX: 0.95, scaleY: 1.06 },
  { at: 0.56, translateY: 0, rotate: 0, scaleX: 1, scaleY: 1 },
  { at: 1, translateY: 0, rotate: 0, scaleX: 1, scaleY: 1 },
];

const LOADING_LOGO_FLIP_KEYFRAMES: LoadingLogoKeyframe[] = [
  { at: 0, translateY: 0, rotate: 0, scaleX: 1, scaleY: 1 },
  { at: 0.06, translateY: 0, rotate: 0, scaleX: 1.12, scaleY: 0.86 },
  { at: 0.15, translateY: -0.28, rotate: 0, scaleX: 0.92, scaleY: 1.1 },
  { at: 0.23, translateY: 0, rotate: 0, scaleX: 1.14, scaleY: 0.84 },
  { at: 0.3, translateY: -0.24, rotate: 0, scaleX: 0.92, scaleY: 1.1 },
  { at: 0.4, translateY: -0.62, rotate: -180, scaleX: 1, scaleY: 1 },
  { at: 0.5, translateY: -0.12, rotate: -360, scaleX: 1, scaleY: 1 },
  { at: 0.55, translateY: 0, rotate: -360, scaleX: 1.16, scaleY: 0.8 },
  { at: 0.63, translateY: 0, rotate: -360, scaleX: 0.95, scaleY: 1.06 },
  { at: 0.71, translateY: 0, rotate: -360, scaleX: 1, scaleY: 1 },
  { at: 1, translateY: 0, rotate: -360, scaleX: 1, scaleY: 1 },
];

export const LOADING_LOGO_LAYERS: LoadingLogoLayer[] = [
  { delayFraction: 0, boxHeight: 110, originX: "34%", originY: "75%", keyframes: LOADING_LOGO_HOP_KEYFRAMES },
  { delayFraction: 110 / 1800, boxHeight: 110, originX: "57%", originY: "75%", keyframes: LOADING_LOGO_HOP_KEYFRAMES },
  { delayFraction: 220 / 1800, boxHeight: 72, originX: "74%", originY: "58%", keyframes: LOADING_LOGO_FLIP_KEYFRAMES },
];
export const LOADING_LOGO_FOOTER_SIZE = 28;
export const LOADING_LOGO_PAGE_SIZE = 56;
export const PAGE_LOADING_MIN_HEIGHT_RATIO = 0.5;
