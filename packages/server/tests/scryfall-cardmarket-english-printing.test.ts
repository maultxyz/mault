import assert from "node:assert/strict";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import { scryfallSyncSource } from "../src/lib/adapters/scryfall/sync";
import { ADAPTERS_BY_GAME_KEY } from "../src/lib/card-search/resolve";

const bulkLines = [
  { id: "en-bolt", lang: "en", name: "Lightning Bolt", set: "2x2", collector_number: "117", cardmarket_id: 664300 },
  { id: "de-bolt", lang: "de", name: "Lightning Bolt", printed_name: "Blitzschlag", set: "2x2", collector_number: "117" },
  { id: "de-own", lang: "de", name: "Shock", set: "m21", collector_number: "159", cardmarket_id: 111 },
  { id: "de-alone", lang: "de", name: "Opt", set: "xyz", collector_number: "1" },
  { id: "fr-bolt", lang: "fr", name: "Lightning Bolt", set: "2x2", collector_number: "117" },
];

test("non-English Scryfall cards borrow the English printing's Cardmarket product", async (context) => {
  context.mock.method(globalThis, "fetch", async (url: string | URL | Request) => {
    const path = String(url);
    if (path.endsWith("/bulk-data")) {
      return Response.json({ data: [{ type: "all_cards", jsonl_download_uri: "https://bulk.test/all.jsonl.gz" }] });
    }
    if (path === "https://bulk.test/all.jsonl.gz") {
      return new Response(gzipSync(bulkLines.map((line) => JSON.stringify(line)).join("\n")));
    }
    throw new Error(`Unexpected network request: ${path}`);
  });

  const cards = await scryfallSyncSource.fetchCards("https://api.scryfall.test/cards", () => {}, "de");
  const dataById = new Map(cards.map((card) => [card.id, JSON.parse(card.data)]));

  assert.deepEqual([...dataById.keys()], ["de-bolt", "de-own", "de-alone"]);
  assert.equal(dataById.get("de-bolt").englishPrintingCardmarketId, 664300);
  assert.equal(dataById.get("de-own").englishPrintingCardmarketId, undefined);
  assert.equal(dataById.get("de-alone").englishPrintingCardmarketId, undefined);

  const pricing = ADAPTERS_BY_GAME_KEY.mtg.cardmarket;
  const productIdOf = (id: string) =>
    pricing?.productIdFromRaw?.({ id, raw: dataById.get(id) } as never);
  assert.equal(productIdOf("de-bolt"), 664300);
  assert.equal(productIdOf("de-own"), 111);
  assert.equal(productIdOf("de-alone"), undefined);
});
