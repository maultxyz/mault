import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test, type TestContext } from "node:test";
import { fileURLToPath } from "node:url";
import { db } from "../src/db";
import { mergeTcgtrackingCatalog } from "../src/lib/tcgtracking/merge";
import type { SyncSourceCard } from "../src/lib/interfaces/card-search";
import type { TcgtrackingCatalogEntry } from "../src/lib/interfaces/tcgtracking";

function entry(id: number, name: string, number: string, extra = {}): TcgtrackingCatalogEntry {
  return {
    product: { id, name, number, rarity: null, ext_data: null, image_url: null, ...extra },
    set: { id: 1, name: "Test Set", abbreviation: "test", published_on: new Date().toISOString() },
  };
}

function source(id: string, raw: object): SyncSourceCard {
  return { id, name: id, setCode: "test", imageUrl: `https://example.test/${id}.jpg`, data: JSON.stringify(raw) };
}

function mtg(id: string, number = "1", extra = {}): SyncSourceCard {
  return source(id, { id, name: `Card ${number}`, set: "test", set_name: "Test Set", collector_number: number, prices: {}, ...extra });
}

async function merge(context: TestContext, game: string, cards: SyncSourceCard[], entries: TcgtrackingCatalogEntry[], stored: object[] = []) {
  context.mock.method(db, "select", () => ({ from: () => ({ where: async () => stored }) }));
  context.mock.method(globalThis, "fetch", async (url: string | URL | Request) => {
    const path = String(url);
    if (path.endsWith("/sets")) return Response.json({ sets: [{ ...entries[0].set, product_count: entries.length }] });
    if (path.endsWith("/cards")) return Response.json({ products: entries.map(({ product }) => product) });
    throw new Error(`Unexpected network request: ${path}`);
  });
  return mergeTcgtrackingCatalog(game, cards, "en", () => {});
}

if (process.env.MAULT_MERGE_HEAP_FIXTURE === "1") {
  test("large raw catalog merges within a bounded heap", async (context) => {
    const cards: SyncSourceCard[] = [];
    const entries: TcgtrackingCatalogEntry[] = [];
    const payload = Array.from({ length: 200 }, (_, index) => ({
      source: `https://example.test/ruling/${index}`,
      text: `${index}: ${"A realistic extended ruling describing card interactions. ".repeat(2)}`,
    }));
    for (let index = 0; index < 2600; index++) {
      cards.push(mtg(`large-${index}`, String(index), { rulings: payload }));
      entries.push(entry(index + 1, `Card ${index}`, String(index), { scryfall_id: `large-${index}` }));
    }
    const result = await merge(context, "mtg", cards, entries);
    assert.equal(result.length, 2600);
    assert.equal(JSON.parse(result[2599].data).tcgtrackingProductId, 2600);
    assert.equal(JSON.parse(result[0].data).rulings.length, 200);
  });
} else {
  test("MTG links direct and existing IDs in order without claiming a product twice", async (context) => {
    const cards = [mtg("direct"), mtg("existing", "2", { tcgplayer_id: 12 }), mtg("duplicate", "3", { tcgplayer_id: 12 }), source("invalid", {})];
    const result = await merge(context, "mtg", cards, [entry(11, "Card 1", "1", { scryfall_id: "direct" }), entry(12, "Card 2", "2")]);
    assert.equal(result, cards);
    assert.deepEqual(result.map(({ id }) => id), ["direct", "existing", "duplicate", "invalid"]);
    assert.equal(JSON.parse(result[0].data).tcgtrackingProductId, 11);
    assert.equal(JSON.parse(result[1].data).tcgtrackingProductId, 12);
    assert.equal(JSON.parse(result[2].data).tcgtrackingProductId, undefined);
    assert.equal(result[3].data, "{}");
  });

  test("set alignment adds missing cards and supersedes stored fallback cards", async (context) => {
    const cards = [1, 2, 3].map((number) => source(String(number), {
      id: String(number), name: `Card ${number}`, set: { code: "test", name: "Test Set" }, collector_number: String(number), type: [],
    }));
    const entries = [1, 2, 3, 4].map((number) => entry(number, `Card ${number}`, String(number)));
    const result = await merge(context, "lorcana", cards, entries, [{ cardId: "tcgp-1", data: { source: "tcgtracking", product: entries[0].product, tcgtrackingSet: entries[0].set } }]);
    assert.deepEqual(result.map(({ id }) => id), ["1", "2", "3", "tcgp-4", "tcgp-1"]);
    assert.equal(JSON.parse(result[3].data).primarySetCode, "test");
    assert.equal(JSON.parse(result[4].data).supersededByCardId, "1");
  });

  test("Gundam parallel matching still reads raw rarity and card number", async (context) => {
    const cards = [source("GD01-001", { card_number: "GD01-001", name: "Pilot", rarity: "R" }), source("parallel", { product_id: "parallel", card_number: "GD01-001", name: "Pilot", rarity: "R+" })];
    const result = await merge(context, "gundam", cards, [entry(21, "Pilot", "GD01-001", { rarity: "R" }), entry(22, "Pilot (R+)", "GD01-001", { rarity: "R+" })]);
    assert.equal(JSON.parse(result[0].data).tcgtrackingProductId, 21);
    assert.equal(JSON.parse(result[1].data).tcgtrackingProductId, 22);
  });

  test("Sorcery artwork keys and foil sibling mapping survive compact summaries", async (context) => {
    const cards = [source("artwork", { name: "Avatar", engine: { rarity: "Unique", subtypes: [], type: "Avatar", elements: [] }, printings: [{ slug: "artwork", set: { code: "test", name: "Test Set" }, meta: { product: "Booster", finish: "Standard" } }] })];
    const result = await merge(context, "sorcery", cards, [entry(31, "Avatar", "1"), entry(32, "Avatar (Foil)", "1")]);
    assert.equal(JSON.parse(result[0].data).tcgtrackingProductId, 31);
    assert.deepEqual(JSON.parse(result[0].data).tcgtrackingFinishProducts, [{ foilType: "Foil", productId: 32 }]);
  });

  test("catalog merge does not retain every parsed raw card under a constrained heap", () => {
    const child = spawnSync(process.execPath, ["--max-old-space-size=256", "--require", "tsx/cjs", fileURLToPath(import.meta.url)], {
      env: { ...process.env, NODE_TEST_CONTEXT: "", MAULT_MERGE_HEAP_FIXTURE: "1" }, encoding: "utf8", timeout: 60000,
    });
    assert.equal(child.status, 0, `${child.signal ?? ""}\n${child.stdout}\n${child.stderr}`);
  });
}
