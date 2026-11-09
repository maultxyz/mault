import type { TtlCache, TtlCacheConfig } from "./interfaces/public-api";

export function createTtlCache<V>({ ttlMs, maxEntries }: TtlCacheConfig): TtlCache<V> {
  const entries = new Map<string, { value: V; expiresAt: number }>();

  const sweepExpired = (now: number) => {
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= now) entries.delete(key);
    }
    while (entries.size >= maxEntries) {
      const oldestKey = entries.keys().next().value;
      if (oldestKey === undefined) break;
      entries.delete(oldestKey);
    }
  };

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= Date.now()) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value) {
      const now = Date.now();
      if (entries.size >= maxEntries) sweepExpired(now);
      entries.set(key, { value, expiresAt: now + ttlMs });
    },
    deleteWhere(shouldDelete) {
      for (const key of entries.keys()) {
        if (shouldDelete(key)) entries.delete(key);
      }
    },
  };
}
