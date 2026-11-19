import type { PlayingCard } from "@magic-vault/shared";
import {
  CATALOG_SEARCH_CACHE_MAX_ENTRIES,
  CATALOG_SEARCH_CACHE_TTL_MS,
  STORED_CARD_CACHE_MAX_ENTRIES,
  STORED_CARD_CACHE_TTL_MS,
} from "../constants/card-search";
import { createKeyedCache } from "../keyed-cache";
import type { KeyedCache } from "../interfaces/cached-value";

const catalogSearchCaches: Pick<KeyedCache<unknown>, "clear">[] = [];

export const storedCardCache = createKeyedCache<PlayingCard | null>(
  STORED_CARD_CACHE_TTL_MS,
  STORED_CARD_CACHE_MAX_ENTRIES,
);

export function createCatalogSearchCache<T>(): KeyedCache<T> {
  const cache = createKeyedCache<T>(
    CATALOG_SEARCH_CACHE_TTL_MS,
    CATALOG_SEARCH_CACHE_MAX_ENTRIES,
  );
  catalogSearchCaches.push(cache);
  return cache;
}

export function catalogCacheKey(parts: (string | number | boolean | null | undefined)[]): string {
  return parts.map((part) => (part === undefined || part === null ? "" : String(part))).join("\u0000");
}

export function clearCatalogReadCaches(): void {
  storedCardCache.clear();
  for (const cache of catalogSearchCaches) cache.clear();
}

export async function loadThroughStoredCardCache(
  cacheKeyOfCardId: (cardId: string) => string,
  cardIds: string[],
  loadMissingCards: (missingCardIds: string[]) => Promise<Map<string, PlayingCard>>,
): Promise<Map<string, PlayingCard>> {
  const missingCardIds: string[] = [];
  let missingCardsLoad: Promise<Map<string, PlayingCard>> | null = null;
  const loadMissingOnce = () => (missingCardsLoad ??= loadMissingCards(missingCardIds));
  const cards = await Promise.all(
    cardIds.map((cardId) =>
      storedCardCache.get(cacheKeyOfCardId(cardId), () => {
        missingCardIds.push(cardId);
        return Promise.resolve()
          .then(loadMissingOnce)
          .then((loaded) => loaded.get(cardId) ?? null);
      }),
    ),
  );
  return new Map(
    cardIds.flatMap((cardId, index) => {
      const card = cards[index];
      return card ? [[cardId, card] as const] : [];
    }),
  );
}
