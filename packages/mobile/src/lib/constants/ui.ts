export const BUTTON_HEIGHTS = { sm: 34, md: 44, lg: 52 } as const;
export const IOS_BUTTON_CONTROL_SIZES = { sm: "small", md: "large", lg: "extraLarge" } as const;
export const IOS_BUTTON_LABEL_FONT_SIZES = { sm: 15, md: 17, lg: 17 } as const;
export const IOS_BUTTON_ICON_SIZE = 17;
export const IOS_BUTTON_STYLES = {
  primary: "glassProminent",
  secondary: "glass",
  destructive: "glass",
  ghost: "borderless",
} as const;
export const IOS_ICON_BUTTON_STYLES = {
  neutral: "glass",
  primary: "glassProminent",
  plain: "borderless",
  camera: "glass",
} as const;
export const MIN_TOUCH_TARGET = 44;
export const TOP_BAR_HEIGHT = 44;
export const TOP_BAR_BRAND_ICON_SIZE = 34;
export const TOP_BAR_SWITCHER_HEIGHT = 32;
export const INPUT_HEIGHT = 48;
export const SEARCH_INPUT_HEIGHT = 44;
export const LIST_ROW_MIN_HEIGHT = 48;
export const LIST_ROW_ICON_SIZE = 36;
export const PAGE_HEADER_ICON_BUTTON_SIZE = 40;
export const IOS_HEADER_BAR_ICON_BUTTON_SIZE = 36;
export const SKELETON_PULSE_MS = 900;
export const DISABLED_OPACITY = 0.5;
export const PILL_STATUS_LETTER_SPACING = 0.3;
export const SLIDER_THUMB_SIZE = 24;
export const SLIDER_TRACK_HEIGHT = 4;
export const SLIDER_HIT_HEIGHT = 40;
export const ICON_BADGE_SIZE = 36;

export const GRADIENT_BURST_SIZE = 360;
export const GRADIENT_BURST_CENTER = 32;
export const GRADIENT_BURST_STOPS = [
  { offset: "0", opacity: 0.45 },
  { offset: "0.35", opacity: 0.3 },
  { offset: "1", opacity: 0 },
] as const;

export const THEME_PREFERENCES = ["light", "dark", "system"] as const;

export const SHUTTER_SIZE = 48;
export const SHUTTER_ICON_SIZE = 20;
export const MULTILINE_INPUT_MIN_HEIGHT = 200;
export const LIST_SKELETON_TITLE_WIDTHS = ["55%", "45%", "35%"] as const;
export const PILL_MIN_HEIGHT = 20;
export const SHEET_MAX_HEIGHT_RATIO = 0.85;
export const IOS_SHEET_TOP_PADDING = 24;

export const SHEET_HEADER_SIDE_MIN_WIDTH = 36;
export const ANDROID_SHEET_TOP_PADDING = 0;
export const SHEET_DISMISS_FALLBACK_MS = 1000;

export const TOAST_DEFAULT_DURATION_MS = 4000;
export const TOAST_UNDO_DURATION_MS = 6000;
export const TOAST_SCREEN_READER_DURATION_MULTIPLIER = 3;
export const TOAST_BOTTOM_OFFSET = 72;
export const TOAST_FADE_MS = 160;
export const EMPTY_STATE_ICON_SIZE = 56;
