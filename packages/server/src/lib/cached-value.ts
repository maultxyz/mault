import { registerCache } from "./cache-registry";
import { CACHED_VALUE_KEY } from "./constants/cached-value";
import type { CachedValue } from "./interfaces/cached-value";

export function createCachedValue<T>(
  name: string,
  compute: () => Promise<T>,
): CachedValue<T> {
  let cached: { value: T; computedAt: number } | null = null;
  let inFlight: Promise<T> | null = null;

  const clear = () => {
    cached = null;
    inFlight = null;
  };

  registerCache({
    name,
    countEntries: () => (cached ? 1 : 0),
    listKeys: () => (cached ? [CACHED_VALUE_KEY] : []),
    deleteKeys: (shouldDelete) => {
      if (!cached || !shouldDelete(CACHED_VALUE_KEY)) return 0;
      clear();
      return 1;
    },
    clear,
  });

  return {
    get(maxAgeMs, options) {
      if (cached && Date.now() - cached.computedAt < maxAgeMs) {
        return Promise.resolve(cached.value);
      }
      if (cached && options?.servesStaleWhileRefreshing) {
        if (!inFlight) void this.get(0).catch((error: unknown) => {
          console.error("Refreshing a cached value failed:", error);
        });
        return Promise.resolve(cached.value);
      }
      if (inFlight) return inFlight;
      const request = compute()
        .then((value) => {
          if (inFlight === request) {
            cached = { value, computedAt: Date.now() };
          }
          return value;
        })
        .finally(() => {
          if (inFlight === request) inFlight = null;
        });
      inFlight = request;
      return request;
    },
    invalidate: clear,
  };
}
