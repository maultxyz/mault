import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDeckLinkUrl } from "@magic-vault/shared";
import { archidektDeckReader } from "../src/lib/deck-links/archidekt";
import { deckLinkImportRows } from "../src/lib/deck-links";
import { moxfieldDeckReader } from "../src/lib/deck-links/moxfield";

const SCRYFALL_ID = "0afa0e33-4804-4b00-b625-c2d6b61090fc";

describe("parseDeckLinkUrl", () => {
  it("reads Moxfield and Archidekt deck ids", () => {
    assert.deepEqual(parseDeckLinkUrl("https://www.moxfield.com/decks/aBc-123_x?tab=main"), {
      source: "moxfield",
      deckId: "aBc-123_x",
    });
    assert.deepEqual(parseDeckLinkUrl("https://archidekt.com/decks/123456/my_deck"), {
      source: "archidekt",
      deckId: "123456",
    });
  });

  it("rejects other links", () => {
    assert.equal(parseDeckLinkUrl("https://moxfield.com/cards/abc"), null);
    assert.equal(parseDeckLinkUrl("https://archidekt.com/decks/not-a-number"), null);
    assert.equal(parseDeckLinkUrl("https://evil.example/decks/123"), null);
    assert.equal(parseDeckLinkUrl("javascript:alert(1)"), null);
  });
});

describe("moxfieldDeckReader", () => {
  it("reads deck boards and skips the maybeboard", () => {
    const read = moxfieldDeckReader.readLines({
      name: "Urza",
      boards: {
        commanders: {
          cards: {
            a: {
              quantity: 1,
              finish: "foil",
              card: { name: "Urza, Lord High Artificer", scryfall_id: SCRYFALL_ID, set: "MH1", cn: "75" },
            },
          },
        },
        mainboard: {
          cards: { b: { quantity: 2, finish: "nonFoil", card: { name: "Sol Ring", set: "c21", cn: "263" } } },
        },
        maybeboard: {
          cards: { c: { quantity: 1, card: { name: "Mox Opal" } } },
        },
      },
    });
    assert.ok(read);
    assert.equal(read.deckName, "Urza");
    assert.deepEqual(
      read.lines.map((line) => [line.name, line.quantity, line.isFoil, line.scryfallId]),
      [
        ["Urza, Lord High Artificer", 1, true, SCRYFALL_ID],
        ["Sol Ring", 2, false, null],
      ],
    );
  });

  it("rejects an unexpected response", () => {
    assert.equal(moxfieldDeckReader.readLines({ error: "nope" }), null);
  });
});

describe("archidektDeckReader", () => {
  it("skips cards whose primary category is outside the deck", () => {
    const read = archidektDeckReader.readLines({
      name: "Burn",
      categories: [
        { name: "Burn", includedInDeck: true },
        { name: "Maybeboard", includedInDeck: false },
      ],
      cards: [
        {
          quantity: 4,
          modifier: "Normal",
          categories: ["Burn"],
          card: {
            uid: SCRYFALL_ID,
            collectorNumber: "161",
            edition: { editioncode: "lea" },
            oracleCard: { name: "Lightning Bolt" },
          },
        },
        {
          quantity: 1,
          modifier: "Foil",
          categories: ["Maybeboard"],
          card: { oracleCard: { name: "Fireblast" } },
        },
      ],
    });
    assert.ok(read);
    assert.deepEqual(
      read.lines.map((line) => [line.name, line.quantity, line.setCode, line.collectorNumber, line.isFoil]),
      [["Lightning Bolt", 4, "lea", "161", false]],
    );
  });
});

describe("deckLinkImportRows", () => {
  it("builds CSV import rows and drops empty lines", () => {
    const rows = deckLinkImportRows([
      { name: "Sol Ring", quantity: 2, setCode: "C21", collectorNumber: "263", scryfallId: SCRYFALL_ID, isFoil: null },
      { name: "Nothing", quantity: 0, setCode: null, collectorNumber: null, scryfallId: null, isFoil: null },
    ]);
    assert.deepEqual(rows, [
      {
        lineNumber: 1,
        name: "Sol Ring",
        setCode: "c21",
        setName: null,
        collectorNumber: "263",
        catalogId: SCRYFALL_ID,
        quantity: 2,
        isFoil: null,
        condition: null,
        language: null,
        cost: null,
      },
    ]);
  });
});
