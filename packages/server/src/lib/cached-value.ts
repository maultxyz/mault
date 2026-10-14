import type { CachedValue } from "./interfaces/cached-value";

export function createCachedValue<T>(
  compute: () => Promise<T>,
): CachedValue<T> {
  let cached: { value: T; computedAt: number } | null = null;
  let inFlight: Promise<T> | null = null;

  return {
    get(maxAgeMs) {
      if (cached && Date.now() - cached.computedAt < maxAgeMs) {
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
    invalidate() {
      cached = null;
      inFlight = null;
    },
  };
}
