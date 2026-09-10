// Query keys never invalidated by a general app-data refresh (invalidateAppQueries)
// — each has its own, narrower invalidation path.
export const QUERY_INVALIDATION_EXCLUDED_KEYS = new Set([
  "games",
  "admin",
  "announcements",
]);
