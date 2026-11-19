import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { lorcanaSyncSource } from "../src/lib/adapters/lorcana/sync";
import { pokemonSyncSource } from "../src/lib/adapters/pokemon/sync";
import { swuSyncSource } from "../src/lib/adapters/swu/sync";
import {
  resetSyncFetchCompleteness,
  syncFetchIncompleteReasons,
} from "../src/lib/sync-job/fetch-completeness";

function mockFetch(context: TestContext, respond: (path: string) => Response) {
  context.mock.method(globalThis, "fetch", async (url: string | URL | Request) =>
    respond(String(url instanceof Request ? url.url : url)),
  );
}

test("a Lorcana set that fails to load marks the fetch incomplete", async (context) => {
  resetSyncFetchCompleteness();
  mockFetch(context, (path) => {
    if (path.endsWith("/sets")) {
      return Response.json({ results: [{ code: "1", name: "The First Chapter" }] });
    }
    return new Response(null, { status: 503 });
  });
  const cards = await lorcanaSyncSource.fetchCards(lorcanaSyncSource.defaultUrl, () => {}, "en");
  assert.deepEqual(cards, []);
  assert.deepEqual(syncFetchIncompleteReasons(), ["The First Chapter could not be fetched"]);
});

test("a Star Wars Unlimited set that fails to load marks the fetch incomplete", async (context) => {
  resetSyncFetchCompleteness();
  mockFetch(context, (path) => {
    if (path.endsWith("/sets")) return Response.json([{ setId: "SOR", fullName: "Spark of Rebellion" }]);
    return new Response(null, { status: 503 });
  });
  const cards = await swuSyncSource.fetchCards(swuSyncSource.defaultUrl, () => {}, "en");
  assert.deepEqual(cards, []);
  assert.deepEqual(syncFetchIncompleteReasons(), ["Spark of Rebellion could not be fetched"]);
});

test("a Pokémon card whose details fail is flagged as partial data", async (context) => {
  mockFetch(context, (path) => {
    if (path.includes("pagination:page=")) {
      return Response.json([
        { id: "sv01-001", localId: "001", name: "Sprigatito", image: "https://img.test/sv01/001" },
        { id: "sv01-002", localId: "002", name: "Floragato", image: "https://img.test/sv01/002" },
      ]);
    }
    if (path.includes("/series/")) return new Response(null, { status: 404 });
    if (path.endsWith("/sv01-001")) {
      return Response.json({ id: "sv01-001", localId: "001", name: "Sprigatito", set: { id: "sv01" } });
    }
    return new Response(null, { status: 500 });
  });
  const cards = await pokemonSyncSource.fetchCards(pokemonSyncSource.defaultUrl, () => {}, "en");
  const partialById = Object.fromEntries(cards.map((card) => [card.id, card.hasPartialData === true]));
  assert.deepEqual(partialById, { "sv01-001": false, "sv01-002": true });
});
