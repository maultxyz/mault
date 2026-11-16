import assert from "node:assert/strict";
import { test } from "node:test";
import type { PlayingCard } from "@magic-vault/shared";
import { createCatalogCardCache } from "../src/lib/catalog-card-cache";
import type { CatalogCardKey } from "../src/lib/interfaces/saved-cards";

function keyOf({ gameKey, lang, cardId }: CatalogCardKey): string {
  return `${gameKey}:${lang}:${cardId}`;
}

function catalogKey(cardId: string): CatalogCardKey {
  return { gameKey: "mtg", lang: "en", cardId };
}

function recordingCatalog(knownCardIds: string[]) {
  const requestedCardIds: string[][] = [];
  return {
    requestedCardIds,
    load: async (keys: CatalogCardKey[]) => {
      requestedCardIds.push(keys.map((key) => key.cardId));
      return new Map(
        keys
          .filter((key) => knownCardIds.includes(key.cardId))
          .map((key) => [keyOf(key), { id: key.cardId, name: key.cardId } as PlayingCard]),
      );
    },
  };
}

function cacheFor(
  catalog: ReturnType<typeof recordingCatalog>,
  overrides: { ttlMs?: number; maxEntries?: number; maxKeysPerCachedRead?: number } = {},
) {
  return createCatalogCardCache({
    ttlMs: overrides.ttlMs ?? 60_000,
    maxEntries: overrides.maxEntries ?? 100,
    maxKeysPerCachedRead: overrides.maxKeysPerCachedRead ?? 100,
    keyOf,
    load: catalog.load,
  });
}

test("cached catalog cards are served without loading them again", async () => {
  const catalog = recordingCatalog(["a", "b"]);
  const cache = cacheFor(catalog);
  const first = await cache.load([catalogKey("a"), catalogKey("b")]);
  const second = await cache.load([catalogKey("a"), catalogKey("b")]);
  assert.deepEqual([...second.keys()].sort(), [...first.keys()].sort());
  assert.deepEqual(catalog.requestedCardIds, [["a", "b"]]);
});

test("only keys missing from the cache are loaded and duplicates are requested once", async () => {
  const catalog = recordingCatalog(["a", "b", "c"]);
  const cache = cacheFor(catalog);
  await cache.load([catalogKey("a")]);
  const cards = await cache.load([catalogKey("a"), catalogKey("b"), catalogKey("b"), catalogKey("c")]);
  assert.equal(cards.size, 3);
  assert.deepEqual(catalog.requestedCardIds, [["a"], ["b", "c"]]);
});

test("cards missing from the catalog are looked up again on the next read", async () => {
  const catalog = recordingCatalog([]);
  const cache = cacheFor(catalog);
  assert.equal((await cache.load([catalogKey("missing")])).size, 0);
  assert.equal((await cache.load([catalogKey("missing")])).size, 0);
  assert.equal(catalog.requestedCardIds.length, 2);
});

test("reads with more keys than the cached read limit bypass the cache", async () => {
  const catalog = recordingCatalog(["a", "b", "c"]);
  const cache = cacheFor(catalog, { maxKeysPerCachedRead: 2 });
  await cache.load([catalogKey("a"), catalogKey("b"), catalogKey("c")]);
  await cache.load([catalogKey("a")]);
  assert.deepEqual(catalog.requestedCardIds, [["a", "b", "c"], ["a"]]);
});

test("expired entries are loaded again", async () => {
  const catalog = recordingCatalog(["a"]);
  const cache = cacheFor(catalog, { ttlMs: -1 });
  await cache.load([catalogKey("a")]);
  await cache.load([catalogKey("a")]);
  assert.equal(catalog.requestedCardIds.length, 2);
});

test("the oldest entry is evicted past the entry limit", async () => {
  const catalog = recordingCatalog(["a", "b", "c"]);
  const cache = cacheFor(catalog, { maxEntries: 2 });
  await cache.load([catalogKey("a"), catalogKey("b"), catalogKey("c")]);
  await cache.load([catalogKey("b"), catalogKey("c")]);
  await cache.load([catalogKey("a")]);
  assert.deepEqual(catalog.requestedCardIds, [["a", "b", "c"], ["a"]]);
});

test("clearing during a load keeps the loaded cards out of the cache", async () => {
  const catalog = recordingCatalog(["a"]);
  const cache = cacheFor(catalog);
  const pending = cache.load([catalogKey("a")]);
  cache.clear();
  assert.equal((await pending).size, 1);
  await cache.load([catalogKey("a")]);
  assert.equal(catalog.requestedCardIds.length, 2);
});
