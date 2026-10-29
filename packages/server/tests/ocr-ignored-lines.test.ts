import assert from "node:assert/strict";
import { test } from "node:test";
import { OCR_REGIONS_BY_GAME_KEY } from "@magic-vault/shared";
import { anchorRegion, isIgnoredLine } from "../src/lib/ocr-anchor";
import { toPageLines } from "../src/lib/ocr";

const [pokemonNameRegion] = OCR_REGIONS_BY_GAME_KEY.pokemon;

test("Pokemon card type headers are never read as a card name", () => {
  assert.ok(isIgnoredLine(pokemonNameRegion, "Pokémon Tool"));
  assert.ok(isIgnoredLine(pokemonNameRegion, "Pokemon Tool TRAINER"));
  assert.ok(isIgnoredLine(pokemonNameRegion, "Supporter"));
  assert.ok(!isIgnoredLine(pokemonNameRegion, "Leftovers"));
  assert.ok(!isIgnoredLine(pokemonNameRegion, "Double Turbo Energy"));
  assert.ok(!isIgnoredLine(pokemonNameRegion, "Pokémon Tower"));
});

test("the Pokemon name region skips a trainer header line", () => {
  const lines = toPageLines([
    { text: "Pokémon Tool", confidence: 0.95, box: { x0: 0.07, y0: 0.04, x1: 0.3, y1: 0.07 } },
  ]);
  assert.equal(anchorRegion(pokemonNameRegion, lines), null);
});
