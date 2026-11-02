import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizePokemonJapanCard } from "../src/lib/adapters/pokemon-japan/search";
import type { TcgtrackingCatalogEntry } from "../src/lib/interfaces/tcgtracking";
import {
  extractOcrTokens,
  printedCollectorNumberCandidates,
  printedSetCodeMatchLength,
} from "../src/routes/card/shared";

function entry(
  name: string,
  rarity: string,
  ext: Record<string, unknown>,
): TcgtrackingCatalogEntry {
  return {
    product: {
      id: 716808,
      name,
      number: "006/103",
      rarity,
      ext_data: ext,
      image_url: null,
      cardmarket_id: 907770,
    },
    set: {
      id: 24721,
      name: "M6a: MEGA Expansion 30th Celebration",
      abbreviation: "m6a",
    },
  };
}

test("Japanese Pokémon cards drop the number suffix and set total", () => {
  const card = normalizePokemonJapanCard(
    entry("Moltres - 006/103", "None", {
      stage: "Basic",
      cardType: ["Fire"],
      hp: "120",
      retreatCost: "1",
      description: "<strong>Ability: Fiery Flapping</strong> Attach energy.",
      attack1: "[Fire][Fire][Colorless] Fire Spin (130)<br> Discard 2 Energy.",
    }),
    "716808",
    "ja",
  );
  assert.equal(card.name, "Moltres");
  assert.equal(card.collectorNumber, "006");
  assert.equal(card.set, "m6a");
  assert.equal(card.rarity, "");
  assert.equal(card.typeLine, "Basic");
  assert.deepEqual(card.colorIdentity, ["Fire"]);
  assert.equal(card.toughness, "120");
  assert.equal(card.cmc, 1);
  assert.equal(card.lang, "ja");
  assert.equal(card.tcgplayerId, "716808");
  assert.equal(
    card.text,
    "Ability: Fiery Flapping Attach energy.\n\n[Fire][Fire][Colorless] Fire Spin (130) Discard 2 Energy.",
  );
});

test("older Japanese Pokémon sets use title-case extended data keys", () => {
  const card = normalizePokemonJapanCard(
    entry("Gloom", "Uncommon", {
      Stage: "Stage 1",
      "Card Type": "Grass",
      HP: "90",
      "Retreat Cost": "2",
      "Attack 1": "[Grass] Drool (30)",
      Artist: "Kagemaru Himeno",
    }),
    "716808",
    "ja",
  );
  assert.equal(card.rarity, "Uncommon");
  assert.equal(card.typeLine, "Stage 1");
  assert.deepEqual(card.colorIdentity, ["Grass"]);
  assert.equal(card.toughness, "90");
  assert.equal(card.artist, "Kagemaru Himeno");
  assert.equal(card.text, "[Grass] Drool (30)");
});

test("collector numbers come from the digits before the slash", () => {
  assert.deepEqual(printedCollectorNumberCandidates("J M6a 006/103"), ["6"]);
  assert.deepEqual(printedCollectorNumberCandidates("SV10 012 / 098"), ["12"]);
  assert.deepEqual(printedCollectorNumberCandidates("001/SV-P"), ["1"]);
  assert.deepEqual(printedCollectorNumberCandidates("M6a 006"), ["6"]);
});

test("the longest printed set code wins over a shorter prefix", () => {
  const tokens = extractOcrTokens("J M6a 006/103");
  assert.equal(printedSetCodeMatchLength("m6a", tokens), 3);
  assert.equal(printedSetCodeMatchLength("M6", tokens), 2);
  assert.equal(printedSetCodeMatchLength("SV10", tokens), 0);
  const merged = extractOcrTokens("M6a006/103");
  assert.equal(printedSetCodeMatchLength("m6a", merged), 3);
  assert.equal(printedSetCodeMatchLength("J", tokens), 0);
});
