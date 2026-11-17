export const CARD_EMBEDDING_DIMENSIONS = 128;
export const BROWSER_SYNC_BATCH_SIZE = 8;
export const BROWSER_SYNC_PARALLEL = 6;
export const BROWSER_SYNC_IMAGE_PROXY_HOSTS = new Set([
  "images.ygoprodeck.com",
  "cdn.tcgtracking.com",
]);

export const SYNC_VECTORIZE_CONCURRENCY_OPTIONS = [1, 2, 4, 8, 16, 32] as const;

export const SYNC_VECTORIZE_CONCURRENCY_DEFAULT =
  4 satisfies (typeof SYNC_VECTORIZE_CONCURRENCY_OPTIONS)[number];

export const SYNC_VECTORIZE_CONCURRENCY_MAX = Math.max(
  ...SYNC_VECTORIZE_CONCURRENCY_OPTIONS,
);
