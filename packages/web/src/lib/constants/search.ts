export const SEARCH_PATH = "/app/search";
export const SEARCH_QUERY_PARAM = "q";
export const GLOBAL_SEARCH_ARIA_KEY_SHORTCUTS = "Control+/ Meta+/";
export const GLOBAL_SEARCH_GAME_BADGE_CLASS =
  "h-8 cursor-pointer rounded-md px-2.5 text-sm hover:bg-foreground/6 md:h-6 md:px-2 md:text-xs";
export const GLOBAL_SEARCH_SELECTED_GAME_BADGE_CLASS =
  "border-primary bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/20";
export const CATALOG_CARD_ROUTE_PATH = `${SEARCH_PATH}/cards/:gameKey/:cardId`;
export const OWNED_CARD_SEARCH_QUERY_KEY = "owned-card-search";
export const CATALOG_SEARCH_QUERY_KEY = "catalog-card-search";
export const CATALOG_CARD_QUERY_KEY = "catalog-card";
export const CARD_PRINTINGS_QUERY_KEY = "card-printings";
export const CATALOG_PRINTING_QUERY_PARAM = "printing";
export const CARD_PRINTINGS_SKELETON_TILES = 6;
export const CARD_PRINTINGS_GRID_CLASS =
  "grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-3 md:grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] md:gap-1.5";
export const CARD_PRINTING_TILE_CLASS =
  "group flex w-full flex-col gap-1.5 rounded-lg p-1.5 text-left outline-none transition-colors hover:bg-foreground/6 focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-primary/10 aria-pressed:ring-2 aria-pressed:ring-primary md:gap-1 md:p-1";
export const CARD_PRINTING_TILE_ART_CLASS = "relative block aspect-[2.5/3.5] w-full overflow-hidden rounded-md";
export const CATALOG_SEARCH_STALE_MS = 60_000;
export const SEARCH_RESULT_SKELETON_ROWS = 3;
export const SEARCH_RESULT_THUMBNAIL_CLASS =
  "block aspect-[2.5/3.5] w-8 shrink-0 overflow-hidden rounded-sm bg-muted md:w-7";
export const SEARCH_RESULT_ICON_CLASS =
  "flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground/6 text-foreground [&_svg]:size-4 md:size-7";
export const SEARCH_ENTRY_CLASS =
  "flex h-11 w-full items-center gap-2 rounded-lg border bg-card px-3 text-base text-foreground/70 transition-colors outline-none hover:bg-foreground/6 focus-visible:ring-2 focus-visible:ring-ring md:h-9 md:text-sm";

export function searchPathFor(query: string): string {
  const trimmedQuery = query.trim();
  return trimmedQuery ? `${SEARCH_PATH}?${new URLSearchParams({ [SEARCH_QUERY_PARAM]: trimmedQuery })}` : SEARCH_PATH;
}

export function catalogCardPath(gameKey: string, cardId: string, searchQuery: string): string {
  const path = `${SEARCH_PATH}/cards/${encodeURIComponent(gameKey)}/${encodeURIComponent(cardId)}`;
  const trimmedQuery = searchQuery.trim();
  return trimmedQuery ? `${path}?${new URLSearchParams({ [SEARCH_QUERY_PARAM]: trimmedQuery })}` : path;
}

export function selectedCatalogPrintingId(searchParams: URLSearchParams, openedCardId: string): string {
  return searchParams.get(CATALOG_PRINTING_QUERY_PARAM) || openedCardId;
}

