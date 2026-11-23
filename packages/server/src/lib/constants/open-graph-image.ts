import type { OpenGraphTheme } from "@magic-vault/shared";
import type { OpenGraphThemePalette } from "../interfaces/open-graph-image";

export const OPEN_GRAPH_FONT_DIRECTORY = "assets/fonts";
export const OPEN_GRAPH_BOLD_FONT_FILE = "Figtree-Bold.ttf";
export const OPEN_GRAPH_MEDIUM_FONT_FILE = "Figtree-Medium.ttf";
export const OPEN_GRAPH_SORTER_PHOTO_FILE = "assets/open-graph/sorters.jpg";

export const OPEN_GRAPH_PRIMARY_COLOR = "#6366f1";
export const OPEN_GRAPH_THEME_PALETTES: Record<OpenGraphTheme, OpenGraphThemePalette> = {
  light: {
    background: "#ffffff",
    foreground: "#292d34",
    secondaryText: "#5c6573",
    eyebrow: "#4f46e5",
    emptyVisual: "#eef0fe",
    cardShadowOpacity: 0.28,
  },
  dark: {
    background: "#111214",
    foreground: "#e3e4e8",
    secondaryText: "#9ea3ad",
    eyebrow: "#a5a8fb",
    emptyVisual: "#1c1d20",
    cardShadowOpacity: 0.7,
  },
};
export const OPEN_GRAPH_JPEG_QUALITY = 88;

export const OPEN_GRAPH_PADDING_X = 72;
export const OPEN_GRAPH_TEXT_MAX_WIDTH = 520;
export const OPEN_GRAPH_ACCENT_BAR_HEIGHT = 14;
export const OPEN_GRAPH_LOGO_TOP = 64;
export const OPEN_GRAPH_LOGO_HEIGHT = 34;
export const OPEN_GRAPH_LOGO_GAP = 14;
export const OPEN_GRAPH_WORDMARK_TEXT = "Mault";
export const OPEN_GRAPH_WORDMARK_FONT_SIZE = 34;
export const OPEN_GRAPH_EYEBROW_BASELINE = 188;
export const OPEN_GRAPH_EYEBROW_FONT_SIZE = 22;
export const OPEN_GRAPH_HEADLINE_TOP_GAP = 18;
export const OPEN_GRAPH_HEADLINE_FONT_SIZES = [62, 56, 50, 44, 40];
export const OPEN_GRAPH_HEADLINE_MAX_LINES = 3;
export const OPEN_GRAPH_HEADLINE_LINE_HEIGHT = 1.1;
export const OPEN_GRAPH_SUBTITLE_FONT_SIZE = 28;
export const OPEN_GRAPH_SUBTITLE_MAX_LINES = 2;
export const OPEN_GRAPH_SUBTITLE_LINE_HEIGHT = 1.3;
export const OPEN_GRAPH_SUBTITLE_TOP_GAP = 20;
export const OPEN_GRAPH_STATS_BASELINE = 548;
export const OPEN_GRAPH_STATS_MAX_WIDTH = 552;
export const OPEN_GRAPH_STAT_FONT_SIZE = 26;
export const OPEN_GRAPH_STAT_ICON_SIZE = 30;
export const OPEN_GRAPH_STAT_ICON_GAP = 10;
export const OPEN_GRAPH_STAT_ITEM_GAP = 34;
export const OPEN_GRAPH_STAT_ICON_STROKE_WIDTH = 2;
export const OPEN_GRAPH_ICON_VIEW_BOX_SIZE = 24;
export const OPEN_GRAPH_ELLIPSIS = "...";
export const OPEN_GRAPH_FALLBACK_HEADLINE = "Mault";

export const OPEN_GRAPH_VISUAL_LEFT = 664;
export const OPEN_GRAPH_VISUAL_RIGHT_MARGIN = 64;
export const OPEN_GRAPH_VISUAL_VERTICAL_MARGIN = 58;
export const OPEN_GRAPH_VISUAL_RADIUS = 28;
export const OPEN_GRAPH_EMPTY_VISUAL_LOGO_WIDTH = 220;

export const OPEN_GRAPH_CARD_ASPECT_RATIO = 2.5 / 3.5;
export const OPEN_GRAPH_SINGLE_CARD_HEIGHT = 500;
export const OPEN_GRAPH_FAN_CARD_HEIGHT = 410;
export const OPEN_GRAPH_FAN_CARD_OFFSET_X = 100;
export const OPEN_GRAPH_FAN_CARD_DROP_Y = 24;
export const OPEN_GRAPH_FAN_CARD_ANGLE_DEGREES = 9;
export const OPEN_GRAPH_CARD_CORNER_RADIUS_RATIO = 0.045;
export const OPEN_GRAPH_CARD_SHADOW_BLUR = 16;
export const OPEN_GRAPH_CARDS_SHOWN_MAX = 3;

export const OPEN_GRAPH_SOURCE_IMAGE_TIMEOUT_MS = 4_000;
export const OPEN_GRAPH_SHARE_IMAGE_CACHE_TTL_MS = 5 * 60_000;
export const OPEN_GRAPH_SHARE_IMAGE_CACHE_MAX_ENTRIES = 60;
export const OPEN_GRAPH_SHARE_IMAGE_CACHE_CONTROL = "public, max-age=300";
export const OPEN_GRAPH_PAGE_IMAGE_CACHE_TTL_MS = 24 * 60 * 60_000;
export const OPEN_GRAPH_PAGE_IMAGE_CACHE_CONTROL = "public, max-age=86400, immutable";
export const OPEN_GRAPH_RATE_LIMIT_KEY_PREFIX = "og-image:";
