import assert from "node:assert/strict";
import { test } from "node:test";
import type { PlayingCard } from "@magic-vault/shared";
import { fabFoilPrintingVariants } from "../src/lib/adapters/fab/foil-printings";

function fabPrinting(
  foiling: string,
  { cardUniqueId = "card-1", setId = "WTR", artVariations = [] as string[] } = {},
): PlayingCard {
  return {
    id: `${cardUniqueId}-${foiling}`,
    name: "Command and Conquer",
    raw: {
      card: { unique_id: cardUniqueId },
      printing: { foiling, set_id: setId, art_variations: artVariations },
    },
  } as unknown as PlayingCard;
}

test("a non-foil scan matches only the Standard FaB printing", () => {
  assert.equal(fabFoilPrintingVariants.matchesFoilType(fabPrinting("S"), null), true);
  assert.equal(fabFoilPrintingVariants.matchesFoilType(fabPrinting("R"), null), false);
});

test("a foil scan matches the FaB printing with that foiling", () => {
  assert.equal(fabFoilPrintingVariants.matchesFoilType(fabPrinting("R"), "Rainbow Foil"), true);
  assert.equal(fabFoilPrintingVariants.matchesFoilType(fabPrinting("C"), "Rainbow Foil"), false);
  assert.equal(fabFoilPrintingVariants.matchesFoilType(fabPrinting("G"), "Cold Foil"), true);
  assert.equal(fabFoilPrintingVariants.matchesFoilType(fabPrinting("R"), "Foil"), true);
  assert.equal(fabFoilPrintingVariants.matchesFoilType(fabPrinting("S"), "Foil"), false);
});

test("FaB printings share artwork only within one card, set and art variation", () => {
  const { isSameArtwork } = fabFoilPrintingVariants;
  assert.equal(isSameArtwork(fabPrinting("S"), fabPrinting("R")), true);
  assert.equal(isSameArtwork(fabPrinting("S"), fabPrinting("R", { setId: "MON" })), false);
  assert.equal(isSameArtwork(fabPrinting("S"), fabPrinting("R", { cardUniqueId: "card-2" })), false);
  assert.equal(isSameArtwork(fabPrinting("S"), fabPrinting("C", { artVariations: ["EA"] })), false);
});
