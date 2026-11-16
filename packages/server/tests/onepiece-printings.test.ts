import assert from "node:assert/strict";
import { test } from "node:test";
import type { PlayingCard } from "@magic-vault/shared";
import { onePieceFoilPrintingVariants } from "../src/lib/adapters/onepiece/foil-printings";
import { onePiecePrintedName } from "../src/lib/adapters/onepiece/printed-id";
import {
  ONE_PIECE_RARE_PRINTING_NAME_SQL_PATTERN,
  ONE_PIECE_REPRINT_CARD_ID_SQL_PATTERN,
} from "../src/lib/constants/onepiece";

function onePiecePrinting(id: string, cardName: string, rarity = "C"): PlayingCard {
  return {
    id,
    name: cardName,
    rarity,
    raw: { card_name: cardName, rarity },
  } as unknown as PlayingCard;
}

test("One Piece printings of one card number share the printed name", () => {
  const printedNames = [
    "Monkey.D.Luffy (119)",
    "Monkey.D.Luffy (OP05-119) (Reprint)",
    "Monkey.D.Luffy (119) (SP) (Gold)",
    "Monkey.D.Luffy - P-075 (Pirate Foil)",
    "Monkey.D.Luffy (091) (Offline Regional 2024 Vol. 3) [Winner]",
    "Monkey.D.Luffy - EB04-061 [Serial Number]",
  ].map(onePiecePrintedName);
  assert.deepEqual(new Set(printedNames), new Set(["Monkey.D.Luffy"]));
  assert.equal(onePiecePrintedName("Jack (Parallel) - Two Legends"), "Jack");
  assert.equal(onePiecePrintedName("Jewelry Bonney -PRB02-004"), "Jewelry Bonney");
  assert.equal(onePiecePrintedName("Shirahoshi (OP05-082) (Jolly Roger Foil)"), "Shirahoshi");
});

test("One Piece printed names keep the parts of the name that are printed", () => {
  assert.equal(onePiecePrintedName("Gum-Gum Jet Pistol"), "Gum-Gum Jet Pistol");
  assert.equal(onePiecePrintedName('Capone"Gang"Bege (OP04-100)'), 'Capone"Gang"Bege');
  assert.equal(onePiecePrintedName("Shachi & Penguin (Pirate Foil)"), "Shachi & Penguin");
  assert.equal(onePiecePrintedName("Did Someone Say...Kami?"), "Did Someone Say...Kami?");
});

test("reprints and foil variants are rare One Piece printings", () => {
  const reprintId = new RegExp(ONE_PIECE_REPRINT_CARD_ID_SQL_PATTERN);
  const rareName = new RegExp(ONE_PIECE_RARE_PRINTING_NAME_SQL_PATTERN, "i");
  assert.equal(reprintId.test("OP05-119_r1"), true);
  assert.equal(reprintId.test("OP05-119"), false);
  assert.equal(reprintId.test("OP05-119_p1"), false);
  assert.equal(rareName.test("Shirahoshi (Jolly Roger Foil)"), true);
  assert.equal(rareName.test("Limejuice (Pirate Foil)"), true);
  assert.equal(rareName.test("Ice Age (Textured Foil)"), true);
  assert.equal(rareName.test("Brook (Reprint)"), true);
  assert.equal(rareName.test("Nami (Parallel)"), false);
});

test("a foil One Piece printing matches only a foil scan", () => {
  const { matchesFoilType } = onePieceFoilPrintingVariants;
  const pirateFoil = onePiecePrinting("OP09-014_r2", "Limejuice (Pirate Foil)", "UC");
  assert.equal(matchesFoilType(pirateFoil, null), false);
  assert.equal(matchesFoilType(pirateFoil, "Foil"), true);
});

test("a foil scan leaves One Piece rarities that are printed foil on the original", () => {
  const { matchesFoilType } = onePieceFoilPrintingVariants;
  assert.equal(matchesFoilType(onePiecePrinting("OP09-014", "Limejuice", "UC"), null), true);
  assert.equal(matchesFoilType(onePiecePrinting("OP09-014", "Limejuice", "UC"), "Foil"), false);
  assert.equal(matchesFoilType(onePiecePrinting("OP05-082", "Shirahoshi", "R"), "Foil"), false);
  assert.equal(matchesFoilType(onePiecePrinting("OP05-119", "Monkey.D.Luffy (119)", "SEC"), "Foil"), true);
});

test("One Piece foil variants share artwork with the original and its reprints only", () => {
  const { isSameArtwork } = onePieceFoilPrintingVariants;
  const original = onePiecePrinting("OP05-082", "Shirahoshi (OP05-082)", "R");
  const reprint = onePiecePrinting("OP05-082_r1", "Shirahoshi (OP05-082) (Reprint)", "R");
  const jollyRoger = onePiecePrinting("OP05-082_p2", "Shirahoshi (OP05-082) (Jolly Roger Foil)", "R");
  const textured = onePiecePrinting("OP05-082_p3", "Shirahoshi (OP05-082) (Textured Foil)", "R");
  const parallel = onePiecePrinting("OP05-082_p1", "Shirahoshi (OP05-082) (Parallel)", "R");
  const otherCard = onePiecePrinting("OP05-083_p2", "Shirahoshi (OP05-083) (Jolly Roger Foil)", "R");
  assert.equal(isSameArtwork(original, jollyRoger), true);
  assert.equal(isSameArtwork(reprint, jollyRoger), true);
  assert.equal(isSameArtwork(jollyRoger, original), true);
  assert.equal(isSameArtwork(original, parallel), false);
  assert.equal(isSameArtwork(original, otherCard), false);
  assert.equal(isSameArtwork(original, textured), false);
  assert.equal(isSameArtwork(textured, original), true);
});
