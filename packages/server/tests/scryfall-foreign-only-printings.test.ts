import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { gzipSync } from "node:zlib";
import { scryfallSyncSource } from "../src/lib/adapters/scryfall/sync";

const defaultCardsLines = [
  { id: "en-norn", lang: "en", name: "Elesh Norn, Mother of Machines", set: "one", collector_number: "10" },
  {
    id: "ph-norn",
    lang: "ph",
    name: "Elesh Norn, Mother of Machines",
    printed_name: "Phyrexian Elesh Norn",
    printed_type_line: "Phyrexian type line",
    printed_text: "Phyrexian text",
    set: "one",
    collector_number: "416",
  },
  {
    id: "ja-nissa",
    lang: "ja",
    name: "Nissa // Nissa, Who Shakes the World",
    set: "war",
    collector_number: "169★",
    card_faces: [
      { name: "Nissa", printed_name: "ニッサ" },
      { name: "Nissa, Who Shakes the World", printed_name: "世界を揺るがす者、ニッサ" },
    ],
  },
  { id: "en-teferi", lang: "en", name: "Teferi, Time Raveler", set: "war", collector_number: "221" },
  { id: "fr-4bb-bolt", lang: "fr", name: "Lightning Bolt", printed_name: "Foudre", set: "4bb", collector_number: "213" },
];

function mockScryfall(context: TestContext, singleCard?: object) {
  context.mock.method(globalThis, "fetch", async (url: string | URL | Request) => {
    const path = String(url);
    if (path.endsWith("/bulk-data")) {
      return Response.json({ data: [{ type: "default_cards", jsonl_download_uri: "https://bulk.test/default.jsonl.gz" }] });
    }
    if (path === "https://bulk.test/default.jsonl.gz") {
      return new Response(gzipSync(defaultCardsLines.map((line) => JSON.stringify(line)).join("\n")));
    }
    if (singleCard && path === "https://api.scryfall.test/cards/ph-norn") {
      return Response.json(singleCard);
    }
    throw new Error(`Unexpected network request: ${path}`);
  });
}

test("the English Scryfall catalog keeps every printing only printed in another language", async (context) => {
  mockScryfall(context);

  const cards = await scryfallSyncSource.fetchCards("https://api.scryfall.test/cards", () => {}, "en");
  const cardById = new Map(cards.map((card) => [card.id, card]));

  assert.deepEqual([...cardById.keys()].sort(), ["en-norn", "en-teferi", "fr-4bb-bolt", "ja-nissa", "ph-norn"]);
  assert.equal(cardById.get("fr-4bb-bolt")?.name, "Lightning Bolt");

  const phyrexian = cardById.get("ph-norn");
  const phyrexianData = JSON.parse(phyrexian?.data ?? "{}");
  assert.equal(phyrexian?.name, "Elesh Norn, Mother of Machines");
  assert.equal(phyrexianData.lang, "ph");
  assert.equal(phyrexianData.printed_name, undefined);
  assert.equal(phyrexianData.printed_type_line, undefined);
  assert.equal(phyrexianData.printed_text, undefined);

  const japaneseFaces = JSON.parse(cardById.get("ja-nissa")?.data ?? "{}").card_faces;
  assert.deepEqual(japaneseFaces, [{ name: "Nissa" }, { name: "Nissa, Who Shakes the World" }]);
});

test("a single English-catalog resync of a foreign-only printing drops its printed language fields", async (context) => {
  mockScryfall(context, defaultCardsLines[1]);

  const { card } = await scryfallSyncSource.fetchOne("ph-norn", "https://api.scryfall.test/cards", "en");
  const data = JSON.parse(card?.data ?? "{}");

  assert.equal(card?.name, "Elesh Norn, Mother of Machines");
  assert.equal(data.lang, "ph");
  assert.equal(data.printed_name, undefined);
});
