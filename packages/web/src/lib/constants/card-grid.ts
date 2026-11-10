import type { CardGridDensity, CardScanTimeline } from "@/lib/interfaces/cards";

export const CARD_GRID_DENSITIES: CardGridDensity[] = [
  "compact",
  "comfortable",
  "large",
];

export const CARD_GRID_DENSITY_CLASS: Record<CardGridDensity, string> = {
  compact:
    "grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] @3xl:grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-1.5",
  comfortable:
    "grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] @3xl:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2",
  large:
    "grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] @3xl:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3",
};

export const CARD_GRID_CLASS = CARD_GRID_DENSITY_CLASS.comfortable;

export const CARD_SCAN_TIMELINE_OPTIONS: CardScanTimeline[] = [
  "off",
  "day",
  "hour",
];

export const CARD_SCAN_TIMELINE_LOAD_AHEAD_MARGIN = "800px";

export const REVIEW_GRID_CLASS =
  "grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3";


export const NEW_CARD_ANIMATION_WINDOW_MS = 5_000;

export const PENDING_SCAN_CARD_SAVED_RETENTION_MS = 30_000;

export const REVIEW_GRID_NO_SELECTION_VALUE = "none";

export const SELECTION_ACTION_BAR_BUTTON_CLASS =
  "text-background hover:bg-background/15 hover:text-background dark:hover:bg-background/15";

export const SELECTION_ACTION_BAR_DESTRUCTIVE_BUTTON_CLASS =
  "bg-destructive text-white hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90";
