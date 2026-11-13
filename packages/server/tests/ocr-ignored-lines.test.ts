import assert from "node:assert/strict";
import { test } from "node:test";
import { OCR_REGIONS_BY_GAME_KEY } from "@magic-vault/shared";
import {
  acceptsLineText,
  anchorRegion,
  isIgnoredLine,
} from "../src/lib/ocr-anchor";
import { toPageLines } from "../src/lib/ocr";

const [pokemonNameRegion, , pokemonNumberRegion, pokemonFallbackNumberRegion] =
  OCR_REGIONS_BY_GAME_KEY.pokemon;

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

test("Pokemon number regions only accept collector number lines", () => {
  for (const region of [pokemonNumberRegion, pokemonFallbackNumberRegion]) {
    assert.ok(acceptsLineText(region, "DRI EN 024/182"));
    assert.ok(acceptsLineText(region, "58/102"));
    assert.ok(acceptsLineText(region, "SVP EN 085"));
    assert.ok(acceptsLineText(region, "SWSH001"));
    assert.ok(!acceptsLineText(region, "the time comes for it to evolve."));
    assert.ok(!acceptsLineText(region, "Its body temperature is 1,800°F"));
    assert.ok(!acceptsLineText(region, "Illus. Ken Sugimori"));
  }
});

test("the Pokemon fallback number region skips flavor text above it", () => {
  const lines = toPageLines([
    { text: "the time comes for it to evolve.", confidence: 0.95, box: { x0: 0.55, y0: 0.905, x1: 0.95, y1: 0.925 } },
  ]);
  assert.equal(anchorRegion(pokemonFallbackNumberRegion, lines), null);
});
