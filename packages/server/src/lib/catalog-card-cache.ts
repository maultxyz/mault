import type { PlayingCard } from "@magic-vault/shared";
import type {
  CatalogCardCache,
  CatalogCardCacheOptions,
  CatalogCardKey,
} from "./interfaces/saved-cards";

export function createCatalogCardCache({
  ttlMs,
  maxEntries,
  maxKeysPerCachedRead,
  keyOf,
  load,
}: CatalogCardCacheOptions): CatalogCardCache {
  const entries = new Map<string, { card: PlayingCard; expiresAt: number }>();
  let generation = 0;

  function remember(cacheKey: string, card: PlayingCard) {
    entries.delete(cacheKey);
    if (entries.size >= maxEntries) {
      const oldestKey = entries.keys().next().value;
      if (oldestKey !== undefined) entries.delete(oldestKey);
    }
    entries.set(cacheKey, { card, expiresAt: Date.now() + ttlMs });
  }

  function cachedCard(cacheKey: string): PlayingCard | undefined {
    const entry = entries.get(cacheKey);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      entries.delete(cacheKey);
      return undefined;
    }
    return entry.card;
  }

  return {
    async load(keys) {
      const uniqueKeys = new Map<string, CatalogCardKey>();
      for (const key of keys) uniqueKeys.set(keyOf(key), key);
      if (uniqueKeys.size > maxKeysPerCachedRead) return load(keys);

      const cards = new Map<string, PlayingCard>();
      const missingKeys: CatalogCardKey[] = [];
      for (const [cacheKey, key] of uniqueKeys) {
        const card = cachedCard(cacheKey);
        if (card) cards.set(cacheKey, card);
        else missingKeys.push(key);
      }
      if (missingKeys.length === 0) return cards;

      const generationAtLoad = generation;
      const loaded = await load(missingKeys);
      const stillCurrent = generationAtLoad === generation;
      for (const [cacheKey, card] of loaded) {
        cards.set(cacheKey, card);
        if (stillCurrent) remember(cacheKey, card);
      }
      return cards;
    },
    clear() {
      generation += 1;
      entries.clear();
    },
  };
}
