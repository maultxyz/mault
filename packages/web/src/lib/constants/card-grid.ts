import type { CardGridDensity } from "@/lib/interfaces/cards";

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


export const NEW_CARD_ANIMATION_WINDOW_MS = 5_000;
