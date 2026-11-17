import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { db } from "../src/db";
import type { SyncSource } from "../src/lib/interfaces/card-search";
import {
  resetSyncFetchCompleteness,
  syncFetchIncompleteReasons,
} from "../src/lib/sync-job/fetch-completeness";
import { withTcgtrackingSync } from "../src/lib/tcgtracking/sync-source";

const storedRow = {
  cardId: "stored",
  name: "Card 1",
  setCode: "test",
  data: { id: "stored", name: "Card 1", set: "test", set_name: "Test Set", collector_number: "1", prices: {} },
};

function failingSource(): SyncSource {
  return {
    gameKey: "mtg",
    label: "Primary",
    defaultUrl: "https://primary.test",
    fetchHeaders: {},
    languages: ["en"],
    fetchCards: async () => {
      throw new Error("Primary card list fetch failed: 503");
    },
    fetchOne: async () => ({ card: null, urls: [] }),
  };
}

function mockStoredCardsAndCatalog(context: TestContext) {
  context.mock.method(db, "select", () => ({ from: () => ({ where: async () => [storedRow] }) }));
  const set = { id: 1, name: "Test Set", abbreviation: "test", published_on: new Date().toISOString() };
  const product = { id: 11, name: "Card 1", number: "1", rarity: null, ext_data: null, image_url: null, scryfall_id: "stored" };
  context.mock.method(globalThis, "fetch", async (url: string | URL | Request) => {
    const path = String(url);
    if (path.endsWith("/sets")) return Response.json({ sets: [{ ...set, product_count: 1 }] });
    if (path.endsWith("/cards")) return Response.json({ products: [product] });
    throw new Error(`Unexpected network request: ${path}`);
  });
}

test("a failing primary source falls back to stored cards and blocks the prune", async (context) => {
  resetSyncFetchCompleteness();
  mockStoredCardsAndCatalog(context);
  const cards = await withTcgtrackingSync(failingSource()).fetchCards("https://primary.test", () => {}, "en");
  assert.deepEqual(cards.map(({ id }) => id), ["stored"]);
  assert.equal(JSON.parse(cards[0].data).tcgtrackingProductId, 11);
  assert.equal(syncFetchIncompleteReasons().length, 1);
  resetSyncFetchCompleteness();
});

test("a cancelled sync still rethrows the primary error", async (context) => {
  resetSyncFetchCompleteness();
  mockStoredCardsAndCatalog(context);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    withTcgtrackingSync(failingSource()).fetchCards("https://primary.test", () => {}, "en", controller.signal),
    /503/,
  );
  assert.equal(syncFetchIncompleteReasons().length, 0);
});
