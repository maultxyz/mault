import { registerCacheClearer } from "./cache-registry";
import type { KeyedCache, KeyedCacheOptions } from "./interfaces/cached-value";

export function createKeyedCache<T>(
  ttlMs: number,
  maxEntries: number,
  { staleWhileRefreshingMs = 0 }: KeyedCacheOptions = {},
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

  function loadOnce(key: string, load: () => Promise<T>): Promise<T> {
    const pending = inFlight.get(key);
    if (pending) return pending;
    const request = load()
      .then((value) => {
        if (value != null) remember(key, value);
        else entries.delete(key);
        return value;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, request);
    return request;
  }

  function refreshInBackground(key: string, load: () => Promise<T>): void {
    try {
      loadOnce(key, load).catch(() => undefined);
    } catch {
      return;
    }
  }

  registerCacheClearer(() => entries.clear());

  return {
    get(key, load) {
      const cached = entries.get(key);
      if (cached) {
        const expiredForMs = Date.now() - cached.expiresAt;
        if (expiredForMs < 0) return Promise.resolve(cached.value);
        if (expiredForMs < staleWhileRefreshingMs) {
          refreshInBackground(key, load);
          return Promise.resolve(cached.value);
        }
      }
      return loadOnce(key, load);
    },
    clear() {
      entries.clear();
    },
  };
}
