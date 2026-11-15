import assert from "node:assert/strict";
import { test } from "node:test";
import {
  filterTradeOfferCardGroups,
  filterTradeOfferLocationSections,
  groupTradeOfferCards,
  groupTradeOfferCardsByLocation,
  limitTradeOfferLocationSections,
  sortTradeOfferCardGroups,
  summarizeTradeOfferPlacements,
  tradeOfferSideTotals,
  type TradeOfferOfferedCard,
  type TradeOfferWantedCard,
  type TradeOfferWantedPlacement,
} from "@magic-vault/shared";

function wanted(scanId: string, overrides: Partial<TradeOfferWantedCard> = {}): TradeOfferWantedCard {
  return {
    scanId,
    gameKey: "mtg",
    name: "Lightning Bolt",
    setCode: "lea",
    setName: "Alpha",
    collectorNumber: "161",
    imageUrl: null,
    condition: "NM",
    isFoil: false,
    foilType: null,
    ...overrides,
  };
}

function offered(overrides: Partial<TradeOfferOfferedCard> = {}): TradeOfferOfferedCard {
  return {
    gameKey: "mtg",
    lang: "en",
    cardId: "bolt",
    name: "Lightning Bolt",
    setCode: "m10",
    setName: "Magic 2010",
    collectorNumber: "146",
    imageUrl: null,
    quantity: 1,
    condition: "NM",
    isFoil: false,
    ...overrides,
  };
}

function stored(locationName: string, position: number): TradeOfferWantedPlacement {
  return {
    collectionName: "Main",
    storageLocationGuid: locationName,
    storageLocationName: locationName,
    storagePosition: position,
    binNumber: null,
  };
}

test("groups identical wanted printings with their scan ids and prices", () => {
  const rows = groupTradeOfferCards(
    [wanted("a"), wanted("b"), wanted("c", { isFoil: true }), wanted("d", { condition: "LP" })],
    [2, 2, 5, null],
    [stored("Box", 3), stored("Box", 1), null, null],
  );
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0].scanIds, ["a", "b"]);
  assert.equal(rows[0].quantity, 2);
  assert.equal(rows[0].unitPrice, 2);
  assert.equal(rows[0].totalPrice, 4);
  assert.equal(rows[0].placements.length, 2);
  assert.equal(rows[2].totalPrice, null);
  assert.equal(rows[2].unitPrice, null);
});

test("adds up offered quantities and derives the unit price from line totals", () => {
  const rows = groupTradeOfferCards(
    [offered({ quantity: 2 }), offered({ quantity: 3 }), offered({ lang: "de" })],
    [4, 6, 1],
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].quantity, 5);
  assert.equal(rows[0].totalPrice, 10);
  assert.equal(rows[0].unitPrice, 2);
  assert.deepEqual(rows[0].scanIds, []);
});

test("sorts by value with unpriced rows last, by name and by set", () => {
  const rows = groupTradeOfferCards(
    [
      wanted("a", { name: "Counterspell", setName: "Beta", collectorNumber: "10" }),
      wanted("b", { name: "Bolt", setName: "Alpha", collectorNumber: "9" }),
      wanted("c", { name: "Ancestral", setName: "Alpha", collectorNumber: "100" }),
    ],
    [1, null, 30],
  );
  assert.deepEqual(sortTradeOfferCardGroups(rows, "value").map((row) => row.card.name), ["Ancestral", "Counterspell", "Bolt"]);
  assert.deepEqual(sortTradeOfferCardGroups(rows, "name").map((row) => row.card.name), ["Ancestral", "Bolt", "Counterspell"]);
  assert.deepEqual(sortTradeOfferCardGroups(rows, "set").map((row) => row.card.name), ["Bolt", "Ancestral", "Counterspell"]);
});

test("filters by trimmed, case-insensitive name or set", () => {
  const rows = groupTradeOfferCards([wanted("a"), wanted("b", { name: "Shock", setName: "Stronghold", setCode: "sth" })]);
  assert.deepEqual(filterTradeOfferCardGroups(rows, "  BOLT ").map((row) => row.card.name), ["Lightning Bolt"]);
  assert.deepEqual(filterTradeOfferCardGroups(rows, "sth").map((row) => row.card.name), ["Shock"]);
  assert.equal(filterTradeOfferCardGroups(rows, "   ").length, 2);
});

test("counts total and unique cards on a side", () => {
  assert.deepEqual(
    tradeOfferSideTotals([offered({ quantity: 4 }), offered({ quantity: 1 }), offered({ cardId: "x", name: "Shock" })], [8, 2, null]),
    { totalCards: 6, uniqueCards: 2, totalValue: 10 },
  );
});

test("groups wanted cards by location in walk order with gone cards last", () => {
  const cards = [wanted("a"), wanted("b", { name: "Shock" }), wanted("c"), wanted("d", { name: "Opt" }), wanted("e", { name: "Duress" })];
  const placements: (TradeOfferWantedPlacement | null)[] = [
    stored("Box B", 1),
    stored("Box A", 9),
    null,
    { collectionName: "Main", storageLocationGuid: null, storageLocationName: null, storagePosition: null, binNumber: 4 },
    stored("Box A", 2),
  ];
  const sections = groupTradeOfferCardsByLocation(cards, [1, 50, 1, 1, 1], placements, "value");
  assert.deepEqual(sections.map((section) => section.kind), ["storage", "storage", "bin", "missing"]);
  assert.equal(sections[0].name, "Box A");
  assert.deepEqual(sections[0].rows.map((row) => row.card.name), ["Duress", "Shock"]);
  assert.equal(sections[2].binNumber, 4);
  assert.deepEqual(filterTradeOfferLocationSections(sections, "shock").map((section) => section.name), ["Box A"]);
  const limited = limitTradeOfferLocationSections(sections, 3);
  assert.deepEqual(limited.map((section) => section.rows.length), [2, 1]);
});

test("summarizes where a merged row's copies are", () => {
  assert.deepEqual(
    summarizeTradeOfferPlacements([
      stored("Box", 7),
      stored("Box", 3),
      { collectionName: "Main", storageLocationGuid: null, storageLocationName: null, storagePosition: null, binNumber: 2 },
      { collectionName: "Main", storageLocationGuid: null, storageLocationName: null, storagePosition: null, binNumber: null },
      null,
    ]),
    [
      { kind: "storage", locationName: "Box", positions: [3, 7] },
      { kind: "bin", collectionName: "Main", binNumbers: [2] },
      { kind: "collection", collectionName: "Main" },
      { kind: "missing", count: 1 },
    ],
  );
});
