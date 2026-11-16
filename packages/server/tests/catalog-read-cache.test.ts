import assert from "node:assert/strict";
import { test } from "node:test";
import type { PlayingCard } from "@magic-vault/shared";
import {
  catalogCacheKey,
  clearCatalogReadCaches,
  createCatalogSearchCache,
  loadThroughStoredCardCache,
} from "../src/lib/card-search/catalog-read-cache";

function playingCard(id: string): PlayingCard {
  return { id, name: `Card ${id}` } as PlayingCard;
}

function recordingCardLoader() {
  const requestedBatches: string[][] = [];
  return {
    requestedBatches,
    load: async (cardIds: string[]) => {
      requestedBatches.push([...cardIds]);
      return new Map(
        cardIds
          .filter((cardId) => !cardId.startsWith("missing"))
          .map((cardId) => [cardId, playingCard(cardId)] as const),
      );
    },
  };
}

test("loads every uncached card in one batch and keeps the requested order", async () => {
  clearCatalogReadCaches();
  const loader = recordingCardLoader();
  const cards = await loadThroughStoredCardCache(
    (cardId) => catalogCacheKey(["mtg", "en", cardId]),
    ["a", "b", "missing-c"],
    loader.load,
  );
  assert.deepEqual(loader.requestedBatches, [["a", "b", "missing-c"]]);
  assert.deepEqual([...cards.keys()], ["a", "b"]);
});

test("serves cached cards and loads only the missing ones", async () => {
  clearCatalogReadCaches();
  const loader = recordingCardLoader();
  const cacheKeyOfCardId = (cardId: string) => catalogCacheKey(["mtg", "en", cardId]);
  await loadThroughStoredCardCache(cacheKeyOfCardId, ["a", "missing-b"], loader.load);
  const cards = await loadThroughStoredCardCache(
    cacheKeyOfCardId,
    ["a", "missing-b", "c"],
    loader.load,
  );
  assert.deepEqual(loader.requestedBatches, [["a", "missing-b"], ["missing-b", "c"]]);
  assert.deepEqual([...cards.keys()], ["a", "c"]);
});

test("keeps cards of different languages apart", async () => {
  clearCatalogReadCaches();
  const loader = recordingCardLoader();
  await loadThroughStoredCardCache((cardId) => catalogCacheKey(["mtg", "en", cardId]), ["a"], loader.load);
  await loadThroughStoredCardCache((cardId) => catalogCacheKey(["mtg", "de", cardId]), ["a"], loader.load);
  assert.equal(loader.requestedBatches.length, 2);
});

test("clearing the catalog caches drops cached cards and searches", async () => {
  clearCatalogReadCaches();
  const loader = recordingCardLoader();
  const searchCache = createCatalogSearchCache<{ loadNumber: number }>();
  let searchLoads = 0;
  const search = () =>
    searchCache.get(catalogCacheKey(["mtg", "en", "bolt", 0]), async () => ({
      loadNumber: ++searchLoads,
    }));
  const cacheKeyOfCardId = (cardId: string) => catalogCacheKey(["mtg", "en", cardId]);
  await loadThroughStoredCardCache(cacheKeyOfCardId, ["a"], loader.load);
  await search();
  await search();
  assert.equal(searchLoads, 1);
  clearCatalogReadCaches();
  await loadThroughStoredCardCache(cacheKeyOfCardId, ["a"], loader.load);
  await search();
  assert.equal(loader.requestedBatches.length, 2);
  assert.equal(searchLoads, 2);
});

test("cache keys keep empty and missing parts distinct from neighbours", () => {
  assert.notEqual(catalogCacheKey(["a", "", "b"]), catalogCacheKey(["a", "b", ""]));
  assert.equal(catalogCacheKey(["a", undefined, null]), catalogCacheKey(["a", "", ""]));
});
