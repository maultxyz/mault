import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { db } from "../src/db";
import { yugiohSyncSource } from "../src/lib/adapters/yugioh/sync";
import { ADAPTERS_BY_GAME_KEY } from "../src/lib/card-search/resolve";
import { mergeTcgtrackingCatalog } from "../src/lib/tcgtracking/merge";
import type { SyncSourceCard } from "../src/lib/interfaces/card-search";
import type { YgoCard } from "../src/lib/interfaces/yugioh";

const tribeInfectingVirus: YgoCard = {
  id: 33184167,
  name: "Tribe-Infecting Virus",
  type: "Effect Monster",
  race: "Aqua",
  attribute: "WATER",
  atk: 1600,
  def: 1000,
  level: 4,
  desc: "Discard 1 card from your hand and declare 1 Type of monster.",
  card_sets: [
    { set_name: "Dark Revelation Volume 1", set_code: "DR1-EN131", set_rarity: "Rare", set_price: "0" },
    { set_name: "Structure Deck: Fury from the Deep", set_code: "SD4-EN007", set_rarity: "Common", set_price: "8.56" },
    { set_name: "Structure Deck: Fury from the Deep", set_code: "SD4-EN007", set_rarity: "Common", set_price: "8.56" },
  ],
  card_images: [{ id: 33184167, image_url: "https://images.test/33184167.jpg", image_url_small: "https://images.test/small/33184167.jpg" }],
  card_prices: [{ tcgplayer_price: "0.25" }],
};

const darkMagician: YgoCard = {
  id: 46986414,
  name: "Dark Magician",
  type: "Normal Monster",
  desc: "The ultimate wizard in terms of attack and defense.",
  card_sets: [
    { set_name: "Legend of Blue Eyes White Dragon", set_code: "LOB-EN005", set_rarity: "Ultra Rare", set_price: "49.41" },
  ],
  card_images: [
    { id: 46986414, image_url: "https://images.test/46986414.jpg", image_url_small: "https://images.test/small/46986414.jpg" },
    { id: 46986415, image_url: "https://images.test/46986415.jpg", image_url_small: "https://images.test/small/46986415.jpg" },
  ],
};

const unreleasedCard: YgoCard = {
  id: 111,
  name: "Unreleased Card",
  type: "Spell Card",
  desc: "",
  card_images: [{ id: 111, image_url: "https://images.test/111.jpg", image_url_small: "https://images.test/small/111.jpg" }],
  card_prices: [{ tcgplayer_price: "1.50" }],
};

const sets = [
  { id: 1, name: "Dark Revelation Volume 1", abbreviation: "DR1", published_on: "2004-05-01" },
  { id: 2, name: "Structure Deck: Fury from the Deep", abbreviation: "SD4", published_on: "2004-10-20" },
  { id: 3, name: "Speed Duel: Battle City Finals", abbreviation: "SBC2", published_on: "2024-12-13" },
  { id: 4, name: "Legend of Blue Eyes White Dragon", abbreviation: "LOB", published_on: "2002-03-08" },
  { id: 5, name: "Legend of Blue Eyes White Dragon (2020 Date Reprint)", abbreviation: "LOB", published_on: "2020-01-01" },
];

function product(id: number, name: string, number: string, rarity: string, ext_data: Record<string, unknown> | null = null) {
  return { id, name, number, rarity, ext_data, image_url: null };
}

const productsBySetId: Record<number, ReturnType<typeof product>[]> = {
  1: [product(1001, "Tribe-Infecting Virus", "DR1-EN131", "Rare")],
  2: [product(1002, "Tribe-Infecting Virus", "SD4-EN007", "Common / Short Print")],
  3: [
    product(1003, "Tribe-Infecting Virus", "SBC2-ENI22", "Common / Short Print", { "Card Type": "Effect Monster", Attack: "1600" }),
    product(1004, "Tribe-Infecting Virus (PSR)", "SBC2-ENI22", "Prismatic Secret Rare"),
  ],
  4: [product(1005, "Dark Magician", "LOB-EN005", "Ultra Rare")],
  5: [product(1006, "Dark Magician", "LOB-EN005", "Ultra Rare")],
};

function mockNetwork(context: TestContext): void {
  context.mock.method(db, "select", () => ({ from: () => ({ where: async () => [] }) }));
  context.mock.method(globalThis, "fetch", async (url: string | URL | Request) => {
    const path = String(url);
    if (path.startsWith("https://db.ygoprodeck.test")) {
      return Response.json({ data: [tribeInfectingVirus, darkMagician, unreleasedCard] });
    }
    if (path.endsWith("/2/sets")) {
      return Response.json({ sets: sets.map((set) => ({ ...set, product_count: productsBySetId[set.id].length })) });
    }
    const setCards = path.match(/\/2\/sets\/(\d+)\/cards$/);
    if (setCards) return Response.json({ products: productsBySetId[Number(setCards[1])] });
    throw new Error(`Unexpected network request: ${path}`);
  });
}

function dataOf(card: SyncSourceCard | undefined): Record<string, unknown> {
  assert.ok(card);
  return JSON.parse(card.data);
}

test("Yu-Gi-Oh sync lists one card per printing and links each to its TCGplayer product", async (context) => {
  mockNetwork(context);
  const cards = await yugiohSyncSource.fetchCards("https://db.ygoprodeck.test/cardinfo.php", () => {});
  assert.deepEqual(cards.map(({ id }) => id), [
    "33184167_DR1-EN131_rare",
    "33184167_SD4-EN007_common",
    "46986414_LOB-EN005_ultra-rare",
    "111",
  ]);
  assert.deepEqual(
    (dataOf(cards[1]).card_sets as unknown[]).length,
    1,
  );

  const merged = await mergeTcgtrackingCatalog("yugioh", cards, "en", () => {});
  const byId = new Map(merged.map((card) => [card.id, card]));

  assert.equal(dataOf(byId.get("33184167_DR1-EN131_rare")).tcgtrackingProductId, 1001);
  assert.equal(dataOf(byId.get("33184167_SD4-EN007_common")).tcgtrackingProductId, 1002);
  assert.equal(dataOf(byId.get("46986414_LOB-EN005_ultra-rare")).tcgtrackingProductId, 1005);
  assert.equal(byId.get("33184167_DR1-EN131_rare")?.imageUrl, "https://images.test/33184167.jpg");
  assert.match(byId.get("46986414_LOB-EN005_ultra-rare")?.imageUrl ?? "", /1005_1000w/);
  assert.equal(byId.get("46986414_LOB-EN005_ultra-rare")?.fallbackImageUrl, "https://images.test/46986414.jpg");

  assert.ok(byId.has("tcgp-1003"));
  assert.ok(byId.has("tcgp-1004"));
  assert.ok(!byId.has("tcgp-1006"));
  assert.equal(byId.get("tcgp-1004")?.name, "Tribe-Infecting Virus");
  assert.equal(byId.get("tcgp-1004")?.setCode, "SBC2");

  const adapter = ADAPTERS_BY_GAME_KEY.yugioh;
  const normalize = (id: string) => adapter.normalizeStored(dataOf(byId.get(id)), id, "en");

  const speedDuel = normalize("tcgp-1004");
  assert.equal(speedDuel?.name, "Tribe-Infecting Virus");
  assert.equal(speedDuel?.set, "SBC2");
  assert.equal(speedDuel?.collectorNumber, "ENI22");
  assert.equal(speedDuel?.rarity, "prismatic secret rare");
  assert.equal(speedDuel?.tcgplayerId, "1004");
  assert.equal((speedDuel?.raw as YgoCard).level, 4);
  assert.equal((speedDuel?.raw as YgoCard).card_images, undefined);

  const revelation = normalize("33184167_DR1-EN131_rare");
  assert.equal(revelation?.set, "DR1");
  assert.equal(revelation?.collectorNumber, "EN131");
  assert.equal(revelation?.price, null);
  assert.equal(revelation?.image?.normal, "https://images.test/33184167.jpg");
  assert.equal(normalize("33184167_SD4-EN007_common")?.price, 8.56);

  const alternateArtworkPrinting = normalize("46986414_LOB-EN005_ultra-rare");
  assert.match(alternateArtworkPrinting?.image?.normal ?? "", /1005_1000w/);

  assert.equal(normalize("111")?.price, 1.5);
});

test("Yu-Gi-Oh rows stored before printings keep resolving by artwork id", () => {
  const adapter = ADAPTERS_BY_GAME_KEY.yugioh;
  const legacy = adapter.normalizeStored(tribeInfectingVirus, "33184167", "en");
  assert.equal(legacy?.set, "DR1");
  assert.equal(legacy?.collectorNumber, "EN131");
  assert.equal(legacy?.price, 0.25);

  const migrated = adapter.normalizeStored(tribeInfectingVirus, "33184167_DR1-EN131_rare", "en");
  assert.equal(migrated?.set, "DR1");
  assert.equal(adapter.normalizeStored(tribeInfectingVirus, "33184167_XYZ-EN001_rare", "en"), null);
});
