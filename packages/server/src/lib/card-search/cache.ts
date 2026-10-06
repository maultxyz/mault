import type { PlayingCard, Result } from "@magic-vault/shared";
import type { CardSearchAdapter } from "../interfaces/card-search";

const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_ENTRIES = 500;

class TtlCache<T> {
  private store = new Map<string, { value: Result<T>; expiresAt: number }>();
  private inFlight = new Map<string, Promise<Result<T>>>();

  get(key: string): Result<T> | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: Result<T>): void {
    if (this.store.size >= MAX_ENTRIES) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) this.store.delete(oldestKey);
    }
    this.store.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  async getOrFetch(
    key: string,
    fetcher: () => Promise<Result<T>>,
  ): Promise<Result<T>> {
    const cached = this.get(key);
    if (cached) return cached;

    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const promise = fetcher()
      .then((result) => {
        if (result.success) this.set(key, result);
        return result;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
    return promise;
  }
}

export function withCache(adapter: CardSearchAdapter): CardSearchAdapter {
  const searchCache = new TtlCache<PlayingCard[]>();
  const byIdCache = new TtlCache<PlayingCard>();

  return {
    ...adapter,
    search(query, baseUrl, lang) {
      const key = `${baseUrl}::${lang}::${query.trim().toLowerCase()}`;
      return searchCache.getOrFetch(key, () =>
        adapter.search(query, baseUrl, lang),
      );
    },
    searchById(id, baseUrl) {
      const key = `${baseUrl}::${id}`;
      return byIdCache.getOrFetch(key, () => adapter.searchById(id, baseUrl));
    },
  };
}
