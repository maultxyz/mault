import type { KeyedCache } from "./interfaces/cached-value";

export function createKeyedCache<T>(
  ttlMs: number,
  maxEntries: number,
): KeyedCache<T> {
  const entries = new Map<string, { value: T; expiresAt: number }>();
  const inFlight = new Map<string, Promise<T>>();

  function remember(key: string, value: T) {
    entries.delete(key);
    if (entries.size >= maxEntries) {
      const oldestKey = entries.keys().next().value;
      if (oldestKey !== undefined) entries.delete(oldestKey);
    }
    entries.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  return {
    get(key, load) {
      const cached = entries.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        return Promise.resolve(cached.value);
      }
      const pending = inFlight.get(key);
      if (pending) return pending;
      const request = load()
        .then((value) => {
          if (value != null) remember(key, value);
          return value;
        })
        .finally(() => inFlight.delete(key));
      inFlight.set(key, request);
      return request;
    },
  };
}
