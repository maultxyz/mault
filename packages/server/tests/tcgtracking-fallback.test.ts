import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeTcgtrackingFallback } from "../src/lib/tcgtracking/fallback";
import { TCGTRACKING_GAMES } from "../src/lib/tcgtracking/games";
import {
  baseCardNameKey,
  cardNameKey,
  collectorNumberKey,
  comparableProductName,
} from "../src/lib/tcgtracking/keys";
import type { TcgtrackingFallbackData } from "../src/lib/interfaces/tcgtracking";

function fallback(ext: Record<string, unknown>): TcgtrackingFallbackData {
  return {
    source: "tcgtracking",
    product: {
      id: 712889,
      name: "Loki (Alternate Art)",
      number: "OP17-119",
      rarity: "Secret Rare",
      ext_data: ext,
      image_url: null,
    },
    set: { id: 24833, name: "The Dominance of God", abbreviation: "OP18" },
  };
}

test("collector numbers drop the set total and leading zeros", () => {
  assert.equal(collectorNumberKey("050/185"), "50");
  assert.equal(collectorNumberKey("014"), "14");
  assert.equal(collectorNumberKey("op01-016"), "OP01-016");
});

test("names compare without punctuation, case or variant suffixes", () => {
  assert.equal(
    cardNameKey("Hera Syndulla -  Renegade General"),
    cardNameKey("Hera Syndulla, Renegade General"),
  );
  assert.equal(baseCardNameKey("Nami (Parallel)"), "nami");
});

test("product names drop the appended number and Pokémon's basic energy prefix", () => {
  const product = (name: string, number: string) => ({
    id: 713248,
    name,
    number,
    rarity: null,
    ext_data: {},
    image_url: null,
  });
  assert.equal(
    cardNameKey(
      comparableProductName(
        TCGTRACKING_GAMES.pokemon,
        product("Basic Grass Energy - 001", "1"),
      ),
    ),
    cardNameKey("Grass Energy"),
  );
  assert.equal(
    baseCardNameKey(
      comparableProductName(
        TCGTRACKING_GAMES.pokemon,
        product("Basic Grass Energy - 009 (30th Celebration)", "009"),
      ),
    ),
    "grass energy",
  );
  assert.equal(
    comparableProductName(
      TCGTRACKING_GAMES.lorcana,
      product("Mickey Mouse - Brave Little Tailor", "115"),
    ),
    "Mickey Mouse - Brave Little Tailor",
  );
  assert.equal(
    comparableProductName(
      TCGTRACKING_GAMES.lorcana,
      product("Basic Fire Energy", "2"),
    ),
    "Basic Fire Energy",
  );
});

test("fallback cards read the older capitalized ext_data shape", () => {
  const card = normalizeTcgtrackingFallback(
    fallback({
      CardType: "Character",
      Subtypes: "FILM",
      Color: "Purple",
      Cost: "8",
      Power: "8000",
      Description: "[On Play] <em>DON!! -2</em>",
    }),
    "tcgp-712889",
    TCGTRACKING_GAMES.onepiece,
  );
  assert.equal(card.typeLine, "Character \u2014 FILM");
  assert.deepEqual(card.colorIdentity, ["Purple"]);
  assert.equal(card.cmc, 8);
  assert.equal(card.text, "[On Play] DON!! -2");
  assert.equal(card.tcgplayerId, "712889");
  assert.equal(card.set, "OP18");
});

test("fallback cards read the newer array ext_data shape", () => {
  const card = normalizeTcgtrackingFallback(
    fallback({
      cardType: ["Character"],
      subtypes: ["Giant", "Elbaph"],
      color: ["Black"],
      cost: "6",
      power: "8000",
    }),
    "tcgp-712889",
    TCGTRACKING_GAMES.onepiece,
  );
  assert.equal(card.typeLine, "Character \u2014 Giant Elbaph");
  assert.deepEqual(card.colorIdentity, ["Black"]);
  assert.equal(card.cmc, 6);
});

test("mtg fallback colors become color letters and keep the full type", () => {
  const card = normalizeTcgtrackingFallback(
    {
      ...fallback({
        color: ["White", "Blue"],
        fullType: "Artifact Creature \u2014 Borg",
      }),
      primarySetCode: "trk",
    },
    "tcgp-725419",
    TCGTRACKING_GAMES.mtg,
  );
  assert.deepEqual(card.colorIdentity, ["W", "U"]);
  assert.equal(card.typeLine, "Artifact Creature \u2014 Borg");
  assert.equal(card.set, "trk");
});
