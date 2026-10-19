export const COLLECTIONS_GRID_CLASS =
  "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

export const COLLECTION_TILE_CLASS =
  "group relative isolate flex flex-col overflow-hidden rounded-lg border bg-card transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-lg motion-reduce:transition-none";

export const COLLECTION_TILE_ACTIVE_CLASS =
  "border-primary/60 ring-1 ring-primary/30";

export const COLLECTION_TILE_LIVE_CLASS =
  "border-warning-border ring-1 ring-warning-border";

export const COLLECTION_TILE_SELECTED_CLASS =
  "border-primary ring-2 ring-primary";

export const COLLECTION_SELECTION_ISLAND_CLASS =
  "fixed inset-x-0 bottom-[calc(var(--mobile-nav-space,0px)+1.5rem)] z-50 mx-auto flex w-fit items-center gap-3 rounded-lg bg-foreground px-1.5 py-1.5 pl-3 text-xs text-background shadow-2xl ring-1 ring-foreground/20 animate-in fade-in-0 slide-in-from-bottom-4 duration-150 motion-reduce:animate-none";

export const COLLECTION_SELECTION_ISLAND_BUTTON_CLASS =
  "text-background hover:bg-background/15 hover:text-background dark:hover:bg-background/15";

export const COLLECTION_PREVIEW_CARD_CLASS =
  "absolute top-1/2 left-1/2 aspect-[2.5/3.5] w-20 rounded-md object-cover shadow-lg ring-1 ring-foreground/10 transition-[translate,rotate] duration-300 ease-out motion-reduce:transition-none";

export const COLLECTION_PREVIEW_FAN_CLASSES = [
  "z-30 -translate-x-1/2 -translate-y-1/2 group-hover:-translate-y-[58%]",
  "z-20 -translate-x-[115%] -translate-y-[44%] -rotate-12 group-hover:-translate-x-[135%] group-hover:-rotate-[18deg]",
  "z-10 translate-x-[15%] -translate-y-[44%] rotate-12 group-hover:translate-x-[35%] group-hover:rotate-[18deg]",
] as const;

export const COLLECTION_STAT_CLASS =
  "flex flex-col gap-0.5 rounded-lg border bg-card px-4 py-3";

export const COLLECTIONS_SKELETON_COUNT = 3;

export const MOBILE_HOME_SEARCH_MIN_COLLECTIONS = 6;

export const COLLECTIONS_PATH = "/app/collections";

export function collectionViewPath(guid: string): string {
  return `${COLLECTIONS_PATH}/${guid}`;
}

export function monitorCollectionPath(guid: string): string {
  return `/app/monitor/${guid}`;
}
