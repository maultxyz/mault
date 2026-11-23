export const LIST_SKELETON_TITLE_WIDTH_CLASSES = ["w-3/5", "w-2/5", "w-1/2", "w-1/3"] as const;
export const LIST_SKELETON_SUBTITLE_WIDTH_CLASSES = ["w-1/3", "w-1/4", "w-2/5"] as const;

export const BIN_LIST_SKELETON_PAIRED_CELLS = 6;

export const STORAGE_PLAN_SKELETON_ROWS = 3;

export const SORT_TEST_SKELETON_BIN_ROWS = 5;

export const MATCH_VALIDATION_QUEUE_SKELETON_ACTIONS = 5;

export const MATCH_VALIDATION_SCAN_GRID_SKELETON_TILES = 12;

export const SOUND_LIST_SKELETON_ROWS = 3;

export const DIVIDED_ROWS_SKELETON_DEFAULT_LINES = ["title", "subtitle"] as const;

export const STATS_LEADERBOARD_SKELETON_ROWS = 10;

export const STATS_HIGHLIGHTS_SKELETON_TILES = 5;

export const TRADE_OFFER_DETAIL_SKELETON_ROWS = 4;

export const PACKING_SLIPS_SKELETON_COUNT = 2;

export const PACKING_SLIP_SKELETON_ROWS = 5;

export const RECEIPT_SKELETON_ROWS = 8;

export const STORAGE_LABEL_LOCATION_SKELETON_ROWS = 6;

export const PRICE_LABEL_CARD_SKELETON_ROWS = 8;

export const PLAN_SETTINGS_SKELETON_ROWS = 6;

export const AUDIT_LOG_SKELETON_ROWS = 4;

export const GAME_FIELD_DEFINITIONS_SKELETON_COLUMNS: readonly import("@/lib/interfaces/skeletons").TableSkeletonColumn[] = [
  { className: "w-40 flex-none", barClassName: "w-24" },
  { className: "w-40 flex-none", barClassName: "w-24" },
  { className: "w-28 flex-none", barClassName: "w-16" },
  { barClassName: "w-3/4" },
  { className: "w-40 flex-none", barClassName: "w-20" },
  { className: "w-10 flex-none", barClassName: "w-4" },
];

export const RECEIPT_SKELETON_COLUMNS: readonly import("@/lib/interfaces/skeletons").TableSkeletonColumn[] = [
  { barClassName: "w-3/4" },
  { barClassName: "w-1/2" },
  { barClassName: "w-10" },
  { alignsEnd: true, barClassName: "w-12" },
];

export const PACKING_SLIP_SKELETON_COLUMNS: readonly import("@/lib/interfaces/skeletons").TableSkeletonColumn[] = [
  { className: "w-12 flex-none", alignsEnd: true, barClassName: "w-4" },
  { barClassName: "w-3/4" },
  { barClassName: "w-1/2" },
  { barClassName: "w-10" },
  { alignsEnd: true, barClassName: "w-12" },
];

export const PRICE_LABEL_CARD_SKELETON_COLUMNS: readonly import("@/lib/interfaces/skeletons").TableSkeletonColumn[] = [
  { className: "w-8 flex-none", barClassName: "size-4" },
  { className: "flex-[2]", barClassName: "w-3/4" },
  { alignsEnd: true, barClassName: "w-12" },
  { className: "w-28 flex-none", barClassName: "h-6 w-full rounded-lg" },
  { alignsEnd: true, barClassName: "w-12" },
];

export const API_USAGE_KEYS_SKELETON_COLUMNS: readonly import("@/lib/interfaces/skeletons").TableSkeletonColumn[] = [
  { barClassName: "w-3/4" },
  { barClassName: "w-2/3" },
  { barClassName: "w-3/4" },
  { alignsEnd: true, barClassName: "w-10" },
  { alignsEnd: true, barClassName: "w-8" },
  { barClassName: "w-2/3" },
];

export const API_USAGE_ROUTES_SKELETON_COLUMNS: readonly import("@/lib/interfaces/skeletons").TableSkeletonColumn[] = [
  { className: "flex-[2]", barClassName: "w-1/2" },
  { alignsEnd: true, barClassName: "w-10" },
  { alignsEnd: true, barClassName: "w-8" },
  { barClassName: "w-2/3" },
];

export const SERVER_CACHES_SKELETON_COLUMNS: readonly import("@/lib/interfaces/skeletons").TableSkeletonColumn[] = [
  { className: "flex-[2]", barClassName: "w-1/2" },
  { alignsEnd: true, barClassName: "w-10" },
  { alignsEnd: true, className: "w-40 flex-none", barClassName: "h-6 w-32 rounded-lg" },
];

export const STATS_LEADERBOARD_SKELETON_COLUMNS: readonly import("@/lib/interfaces/skeletons").TableSkeletonColumn[] = [
  { className: "w-16 flex-none", barClassName: "w-6" },
  { className: "flex-[3]", barClassName: "w-1/2" },
  { alignsEnd: true, barClassName: "w-12" },
];

export const STORAGE_CARDS_SKELETON_COLUMNS: readonly import("@/lib/interfaces/skeletons").TableSkeletonColumn[] = [
  { className: "w-8 flex-none", barClassName: "size-4" },
  { className: "w-12 flex-none", alignsEnd: true, barClassName: "w-6" },
  { className: "w-10 flex-none", barClassName: "h-6 w-5 rounded-sm" },
  { className: "flex-[2]", barClassName: "w-3/4" },
  { className: "max-sm:hidden", barClassName: "w-1/2" },
  { alignsEnd: true, barClassName: "w-12" },
  { className: "w-10 flex-none", barClassName: "size-4" },
];

export const BUYLIST_TIER_SKELETON_ROWS = 3;

export const STORAGE_CARDS_SKELETON_ROWS = 8;

export const SHORT_LINK_SKELETON_LINES = ["title", "subtitle", "detail"] as const;

export const SHORT_LINK_SKELETON_TRAILING = ["iconButton", "button", "button"] as const;

export const SYNC_API_KEY_SKELETON_LINES = ["title", "badges", "subtitle"] as const;

export const WEBHOOK_SKELETON_LINES = ["title", "subtitle", "badges", "detail"] as const;

export const ICON_BUTTON_SKELETON_TRAILING = ["iconButton"] as const;

export const TWO_BUTTONS_SKELETON_TRAILING = ["button", "button"] as const;

export const TWO_ICON_BUTTONS_SKELETON_TRAILING = ["iconButton", "iconButton"] as const;

export const SELECT_SKELETON_TRAILING = ["select"] as const;

export const TITLE_ONLY_SKELETON_LINES = ["title"] as const;

export const PLATFORM_DISCORD_SKELETON_SECTIONS: readonly import("@/lib/interfaces/skeletons").SettingsSectionSkeletonProps[] = [
  { fields: 3, hasAction: true },
  { fields: 1 },
  { fields: 1 },
  { fields: 2 },
];

export const DISCORD_INTEGRATION_SKELETON_SECTIONS: readonly import("@/lib/interfaces/skeletons").SettingsSectionSkeletonProps[] = [
  { fields: 2 },
  { fields: 2 },
  { fields: 2 },
];

export const SERVER_CACHE_KEYS_SKELETON_ROWS = 8;
