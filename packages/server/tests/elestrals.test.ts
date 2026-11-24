import assert from "node:assert/strict";
import { test } from "node:test";
import {
  elestralsCardName,
  elestralsSetCode,
  normalizeElestralsCard,
} from "../src/lib/adapters/elestrals/search";
import { ELESTRALS_RARE_PRINTING_NAME_PATTERN } from "../src/lib/constants/card-search";
import type { TcgtrackingCatalogEntry } from "../src/lib/interfaces/tcgtracking";

function entry(
  name: string,
  number: string | null = "SST-028",
  setAbbreviation: string | null = "SST",
  ext: Record<string, unknown> | null = null,
  rarity = "Uncommon",
): TcgtrackingCatalogEntry {
  return {
    product: {
      id: 693682,
      name,
      number,
      rarity,
      ext_data: ext,
      image_url: null,
    },
    set: { id: 24657, name: "Divine Champions: Sunstrike", abbreviation: setAbbreviation },
  };
}

test("Elestrals names drop TCGplayer variant and number tags but keep subtitles", () => {
  const cases: [string, string][] = [
    ["Eddy (SST-028)", "Eddy"],
    ["Voltempest (Serialized)", "Voltempest"],
    ["Teratlas (Stellar)", "Teratlas"],
    ["Arcalith - Champion of Zeus", "Arcalith - Champion of Zeus"],
    ["Ohmperial - Champion of Hera (SST-033)", "Ohmperial - Champion of Hera"],
    ["Lunar Phase - Full Moon (Stellar)", "Lunar Phase - Full Moon"],
    ["Centaurbor [Gold OP Stamp]", "Centaurbor"],
  ];
  for (const [productName, cardName] of cases) {
    assert.equal(elestralsCardName(entry(productName)), cardName);
  }
});

test("Elestrals set codes follow the printed collector number prefix", () => {
  assert.equal(elestralsSetCode(entry("Eddy", "SST-028", "SSTSD")), "SST");
  assert.equal(elestralsSetCode(entry("Eddy", "PR1-12", "PR")), "PR1");
  assert.equal(elestralsSetCode(entry("Eddy", "KSA-13", null)), "KSA");
  assert.equal(elestralsSetCode(entry("Eddy", "FST-SD097", "FST")), "FST");
  assert.equal(elestralsSetCode(entry("Eddy", "/99", "BS1")), "BS1");
  assert.equal(elestralsSetCode(entry("Eddy", null, null)), "24657");
});

test("Elestrals cards normalize both TCGTracking ext data shapes", () => {
  const card = normalizeElestralsCard(
    entry("Eddy (SST-028)", "SST-028", "SST", {
      Description: "When this Eddy is destroyed in battle you can change the Position of each Elestral.",
      ElementType: "Water",
      "Element Cost": "Water",
      CardType: "Elestral",
      Subclass: "Eldritch;Oceanic",
      Attack: "4",
      Defense: "1",
    }),
    "693682",
    "en",
  );
  assert.equal(card.name, "Eddy");
  assert.equal(card.collectorNumber, "SST-028");
  assert.equal(card.set, "SST");
  assert.equal(card.typeLine, "Elestral | Eldritch / Oceanic");
  assert.equal(card.power, "4");
  assert.equal(card.toughness, "1");
  assert.deepEqual(card.colorIdentity, ["Water"]);
  assert.equal(card.tcgplayerId, "693682");

  const rune = normalizeElestralsCard(
    entry(
      "Full Frontage",
      "CP1-10",
      null,
      {
        description: "When you Cast this FullFrontage you can Enchant up to DDD to it.",
        cardType: ["Rune"],
        elementType: ["Lunar"],
        runeType: "Divine",
        subclass: "Spectral;Ethereal",
        attack: null,
      },
      "R",
    ),
    "581700",
    "en",
  );
  assert.equal(rune.typeLine, "Divine | Rune | Spectral / Ethereal");
  assert.equal(rune.rarity, "Rare");
  assert.deepEqual(rune.colorIdentity, ["Lunar"]);
  assert.equal(rune.power, undefined);
});

test("Elestrals rare printings are serialized, stamped and placement products, not alternate art", () => {
  const rarePrinting = new RegExp(ELESTRALS_RARE_PRINTING_NAME_PATTERN);
  for (const name of [
    "Eddy (SST-028)",
    "Teratlas (Stellar)",
    "Blizzard - Whiteout (Full Art)",
    "Vipyro (Alternative Art)",
    "Arcalith - Champion of Zeus",
  ]) {
    assert.equal(rarePrinting.test(name), false, name);
  }
  for (const name of [
    "Voltempest (Serialized)",
    "Leonite (Seralized)",
    "Penterror (Box Topper)",
    "Vipyro (Holo)",
    "Vipyro (Reverse Holo)",
    "Centaurbor (Gold OP Stamp)",
    "Trifernal (Gold Champion Stamped)",
    "Majesea (TOP 16)",
    "Ohmperial (2nd Place)",
    "Ohmperial (1ST)",
    "Teratlas (Metal Card)",
  ]) {
    assert.equal(rarePrinting.test(name), true, name);
  }
});
