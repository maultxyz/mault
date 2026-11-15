import assert from "node:assert/strict";
import { test } from "node:test";
import {
  digimonCardName,
  digimonSetCode,
  normalizeDigimonCard,
} from "../src/lib/adapters/digimon/search";
import { DIGIMON_RARE_PRINTING_NAME_PATTERN } from "../src/lib/constants/card-search";
import type { TcgtrackingCatalogEntry } from "../src/lib/interfaces/tcgtracking";

function entry(
  name: string,
  setAbbreviation: string | null = "BT-24",
  ext: Record<string, unknown> | null = null,
): TcgtrackingCatalogEntry {
  return {
    product: {
      id: 664935,
      name,
      number: "BT24-010 C",
      rarity: "Common",
      ext_data: ext,
      image_url: null,
      cardmarket_id: 812345,
    },
    set: { id: 23999, name: "Time Stranger", abbreviation: setAbbreviation },
  };
}

test("Digimon names drop TCGplayer variant tags but keep X Antibody", () => {
  const cases: [string, string][] = [
    ["Greymon", "Greymon"],
    ["Koromon (Judge Pack 2)", "Koromon"],
    ["Biyomon - ST1-02 (Event Pack 1)", "Biyomon"],
    [
      "Agumon - ST1-03 (2021 Championship Online Regional) [Online Champion]",
      "Agumon",
    ],
    ["Jesmon (X Antibody) // Ultimate Seibaken (Alternate Art)", "Jesmon (X Antibody) // Ultimate Seibaken"],
    ["BeelStarmon ACE (Alternate Art) (Box Topper)", "BeelStarmon ACE"],
    ["Agumon - Bond of Bravery ACE", "Agumon - Bond of Bravery ACE"],
  ];
  for (const [productName, cardName] of cases) {
    assert.equal(digimonCardName(entry(productName)), cardName);
  }
});

test("Digimon set codes follow the printed card number prefix", () => {
  assert.equal(digimonSetCode(entry("Greymon", "BT-24")), "BT24");
  assert.equal(digimonSetCode(entry("Greymon", "ST-1")), "ST1");
  assert.equal(digimonSetCode(entry("Greymon", "EX-08")), "EX8");
  assert.equal(digimonSetCode(entry("Greymon", "BT-24_PR")), "BT24_PR");
  assert.equal(digimonSetCode(entry("Greymon", "LM-01-05")), "LM-01-05");
  assert.equal(digimonSetCode(entry("Greymon", null)), "23999");
});

test("Digimon cards normalize TCGTracking ext data", () => {
  const card = normalizeDigimonCard(
    entry("Greymon", "BT-24", {
      cardType: ["Digimon"],
      color: ["Red"],
      levelLv: "4",
      digimonForm: "Champion",
      digimonAttribute: "Virus",
      digimonType: "Dinosaur/Titan/TS",
      digimonPowerDp: "5000",
      playCost: "5",
      description: "[Blocker]\r\n<br><em>On Deletion</em> De-Digivolve 1.",
      inheritedEffect: "[Raid]",
      securityEffect: null,
    }),
    "664935",
    "en",
  );
  assert.equal(card.name, "Greymon");
  assert.equal(card.collectorNumber, "BT24-010");
  assert.equal(card.set, "BT24");
  assert.equal(card.setName, "Time Stranger");
  assert.equal(card.typeLine, "Digimon | Lv.4 | Champion | Virus | Dinosaur/Titan/TS");
  assert.equal(card.text, "[Blocker]\nOn Deletion De-Digivolve 1.\n\n[Raid]");
  assert.equal(card.power, "5000");
  assert.equal(card.cmc, 5);
  assert.deepEqual(card.colorIdentity, ["Red"]);
  assert.equal(card.tcgplayerId, "664935");
  assert.equal(card.lang, "en");
});

test("Digimon cards without ext data still normalize", () => {
  const card = normalizeDigimonCard(entry("Greymon"), "664935", "en");
  assert.equal(card.typeLine, "");
  assert.equal(card.text, undefined);
  assert.equal(card.cmc, undefined);
  assert.deepEqual(card.colorIdentity, []);
});

test("Digimon rare printings are promo tags, not alternate art or X Antibody", () => {
  const rarePrinting = new RegExp(DIGIMON_RARE_PRINTING_NAME_PATTERN);
  assert.equal(rarePrinting.test("Greymon"), false);
  assert.equal(rarePrinting.test("Jesmon (X Antibody)"), false);
  assert.equal(rarePrinting.test("Greymon (Alternate Art)"), false);
  assert.equal(rarePrinting.test("Agumon - Bond of Bravery ACE"), false);
  assert.equal(rarePrinting.test("Koromon (Judge Pack 2)"), true);
  assert.equal(rarePrinting.test("Biyomon - ST1-02 (Event Pack 1)"), true);
  assert.equal(rarePrinting.test("BeelStarmon ACE (Alternate Art) (Box Topper)"), true);
  assert.equal(rarePrinting.test("Agumon [Online Champion]"), true);
});
