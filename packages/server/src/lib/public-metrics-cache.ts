import type { PublicMetrics } from "@magic-vault/shared";

// The underlying query aggregates across the entire collection_cards/
// unmatched_cards tables (every org, no index-friendly filter) - fine for an
// occasional admin page view, too slow to recompute on every 30s poll. Cache
// the one global result for a short TTL instead, with in-flight
// de-duplication so concurrent requests during a cache miss share one query
// rather than each triggering their own.
const CACHE_TTL_MS = 60_000;

let cached: { value: PublicMetrics; expiresAt: number } | null = null;
let inFlight: Promise<PublicMetrics> | null = null;

export async function getCachedPublicMetrics(
  compute: () => Promise<PublicMetrics>,
): Promise<PublicMetrics> {
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (inFlight) return inFlight;

  inFlight = compute()
    .then((value) => {
      cached = { value, expiresAt: Date.now() + CACHE_TTL_MS };
      return value;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
