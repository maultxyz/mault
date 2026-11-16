import type { WrappedStorySlide } from "@/lib/interfaces/cards";

export const WRAPPED_SLIDE_DURATION_MS = 5000;

export const WRAPPED_BLOB_POSITIONS = ["15% 15%", "85% 10%", "10% 95%", "90% 85%"];

export const WRAPPED_SLIDE_MESH: Record<WrappedStorySlide["type"], { base: string; colors: string[] }> = {
  intro: {
    base: "#2e1065",
    colors: ["#f0abfc", "#a855f7", "#4f46e5", "#e879f9"],
  },
  total: {
    base: "#172554",
    colors: ["#38bdf8", "#2563eb", "#4338ca", "#22d3ee"],
  },
  unique: {
    base: "#022c22",
    colors: ["#34d399", "#0d9488", "#0e7490", "#4ade80"],
  },
  set: {
    base: "#431407",
    colors: ["#fbbf24", "#ea580c", "#dc2626", "#fb923c"],
  },
  rarity: {
    base: "#4a0519",
    colors: ["#fb7185", "#db2777", "#a21caf", "#f9a8d4"],
  },
  color: {
    base: "#2e1065",
    colors: ["#c4b5fd", "#9333ea", "#a21caf", "#818cf8"],
  },
  mvp: {
    base: "#451a03",
    colors: ["#fde047", "#f59e0b", "#ea580c", "#fbbf24"],
  },
  value: {
    base: "#022c22",
    colors: ["#86efac", "#059669", "#0f766e", "#a3e635"],
  },
  speed: {
    base: "#450a0a",
    colors: ["#fca5a5", "#e11d48", "#ea580c", "#fbbf24"],
  },
};

export const WRAPPED_GRAIN_OVERLAY =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export const CARD_REVIEW_SEARCH_PARAM = "review";
export const CARD_REVIEW_GRID_PARAM_VALUE = "grid";
export const CARD_GRID_SEARCH_QUERY_PARAM = "q";
export const CARD_GRID_SORT_PARAM = "sort";
export const CARD_GRID_PAGE_PARAM = "page";
export const CARD_FILTER_LIST_SEARCH_PARAMS = {
  colors: "colors",
  rarities: "rarities",
  sets: "sets",
  foilTypes: "foils",
} as const;
export const CARD_FILTER_BINS_PARAM = "bins";
export const CARD_FILTER_NO_BIN_PARAM_VALUE = "none";
export const CARD_FILTER_NEEDS_ATTENTION_PARAM = "attention";
export const CARD_FILTER_HIDE_DOWNLOADED_PARAM = "hideDownloaded";
export const CARD_FILTER_MIN_MATCH_PERCENT_PARAM = "minMatch";
export const CARD_FILTER_ENABLED_PARAM_VALUE = "1";
export const CARD_FILTER_SEARCH_PARAM_NAMES: readonly string[] = [
  ...Object.values(CARD_FILTER_LIST_SEARCH_PARAMS),
  CARD_FILTER_BINS_PARAM,
  CARD_FILTER_NEEDS_ATTENTION_PARAM,
  CARD_FILTER_HIDE_DOWNLOADED_PARAM,
  CARD_FILTER_MIN_MATCH_PERCENT_PARAM,
];
export const REVIEW_QUEUE_MAX_PAGES = 20;

export const DETAIL_PREFETCH_COUNT = 3;

export const DETAIL_PREFETCH_STALE_MS = 30 * 1000;

export const CARD_SEARCH_ALL_SETS = "all";
export const CARD_CORRECTION_INLINE_GRID_CLASS =
  "grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]";
export const REVIEW_LAYOUT_WITH_SCAN_COLUMNS_CLASS =
  "@5xl:grid-cols-[minmax(0,36rem)_minmax(20rem,1fr)]";
export const REVIEW_LAYOUT_WITHOUT_SCAN_COLUMNS_CLASS =
  "@5xl:grid-cols-[minmax(0,18rem)_minmax(20rem,1fr)]";
export const SIMILAR_MATCHES_ACCORDION_VALUE = "similar-matches";
export const CARD_DETAIL_TOP_BAR_CLASS =
  "sticky top-0 z-10 bg-background/80 backdrop-blur-2xl border-b p-2 flex items-center justify-between gap-2";
export const CARD_DETAIL_SCROLL_CLASS =
  "@container flex-1 min-h-0 overflow-y-auto p-4 md:px-3 md:py-2 flex flex-col gap-5 md:gap-2";
export const CARD_DETAIL_BODY_COLUMNS_CLASS = "@3xl:grid-cols-[auto_minmax(0,1fr)]";
export const CARD_DETAIL_IMAGES_CLASS =
  "flex flex-wrap gap-3 items-start @3xl:flex-col @6xl:flex-row max-md:grid max-md:grid-cols-2";
export const CARD_DETAIL_SECTIONS_CLASS = "flex flex-col gap-6 md:gap-2 min-w-0";
export const CARD_DETAIL_IMAGE_WIDTH_CLASS = "w-56 max-md:w-full";
export const CARD_DETAIL_ACTION_BAR_CLASS = "shrink-0 bg-background/80 backdrop-blur-2xl p-2 border-t";
export const CARD_DETAIL_ACTION_ROW_CLASS =
  "flex flex-wrap gap-2 items-center w-full max-md:gap-1.5 max-md:[&>*]:flex-1";
export const CARD_DETAIL_SKELETON_SECTION_COUNT = 3;
