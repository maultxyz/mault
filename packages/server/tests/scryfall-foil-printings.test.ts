import assert from "node:assert/strict";
import { test } from "node:test";
import type { PlayingCard } from "@magic-vault/shared";
import {
  scryfallFoilPrintingVariants,
  scryfallFoilTreatment,
} from "../src/lib/adapters/scryfall/foil-printings";

function printing(raw: Record<string, unknown>): PlayingCard {
  return {
    raw: { set: "40k", illustration_id: "art-1", ...raw },
  } as unknown as PlayingCard;
}

const regular = printing({ finishes: ["nonfoil"], promo_types: ["universesbeyond"] });
const surge = printing({ finishes: ["foil"], promo_types: ["surgefoil", "universesbeyond"] });
const traditional = printing({ finishes: ["nonfoil", "foil"] });
const etched = printing({ finishes: ["etched"] });
const { matchesFoilType, isSameArtwork } = scryfallFoilPrintingVariants;

test("foil printings: labels map to Scryfall treatments", () => {
  assert.equal(scryfallFoilTreatment("Surge"), "surgefoil");
  assert.equal(scryfallFoilTreatment("Neon Ink"), "neonink");
  assert.equal(scryfallFoilTreatment("Step-And-Compleat"), "stepandcompleat");
  assert.equal(scryfallFoilTreatment("Silverscreen"), "silverfoil");
  assert.equal(scryfallFoilTreatment("Etched"), "etched");
  assert.equal(scryfallFoilTreatment("Traditional"), null);
});

test("foil printings: a treatment only matches the printing that has it", () => {
  assert.equal(matchesFoilType(regular, "Surge"), false);
  assert.equal(matchesFoilType(surge, "Surge"), true);
  assert.equal(matchesFoilType(traditional, "Surge"), false);
  assert.equal(matchesFoilType(etched, "Etched"), true);
  assert.equal(matchesFoilType(traditional, "Etched"), false);
});

test("foil printings: plain foil and non-foil skip special treatments", () => {
  assert.equal(matchesFoilType(traditional, "Traditional"), true);
  assert.equal(matchesFoilType(surge, "Traditional"), false);
  assert.equal(matchesFoilType(regular, null), true);
  assert.equal(matchesFoilType(surge, null), false);
});

test("foil printings: same artwork needs the same set and illustration", () => {
  assert.equal(isSameArtwork(regular, surge), true);
  assert.equal(isSameArtwork(regular, printing({ illustration_id: "art-2" })), false);
  assert.equal(isSameArtwork(regular, printing({ set: "pip" })), false);
});
