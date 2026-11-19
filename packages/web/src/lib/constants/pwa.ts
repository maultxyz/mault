export const STALE_CHUNK_ERROR_PATTERN =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i;
export const STALE_CHUNK_RELOAD_AT_KEY = "mault:stale-chunk-reload-at";
export const STALE_CHUNK_RELOAD_GUARD_MS = 30_000;
