import assert from "node:assert/strict";
import { test } from "node:test";
import {
  OCR_REGIONS_BY_GAME_KEY,
  prefersTextMatch,
  readPrintedLanguage,
  readsPrintedLanguageEveryScan,
  scanOcrMode,
  type CardSearchResult,
} from "@magic-vault/shared";
import { acceptsLineText } from "../src/lib/ocr-anchor";

function languageRegion(gameKey: string) {
  const region = OCR_REGIONS_BY_GAME_KEY[gameKey]?.find(
    (candidate) => candidate.field === "language",
  );
  assert.ok(region, `${gameKey} has a language region`);
  return region;
}

function imageResultInLanguage(lang: string): CardSearchResult {
  return {
    success: true,
    data: [
      { id: "a", cardId: "a", distance: 0.1, confidence: 0.9, lang },
      { id: "b", cardId: "b", distance: 0.3, confidence: 0.5, lang },
    ],
  };
}

test("printed language codes map to catalog languages", () => {
  assert.equal(readPrintedLanguage("mtg", "ONE • EN Jesper Ejsing"), "en");
  assert.equal(readPrintedLanguage("mtg", "DMU•JP"), "ja");
  assert.equal(readPrintedLanguage("mtg", "MOM • SP"), "es");
  assert.equal(readPrintedLanguage("mtg", "WAR • CS"), "zhs");
  assert.equal(readPrintedLanguage("mtg", "0123 R"), null);
  assert.equal(readPrintedLanguage("lorcana", "204/204 · DE · 1"), "de");
  assert.equal(readPrintedLanguage("pokemon", "DRI FR 024/182"), "fr");
  assert.equal(readPrintedLanguage("fab", "WTR EN 001"), null);
});

test("language regions only anchor to lines with a language code", () => {
  const mtg = languageRegion("mtg");
  assert.ok(acceptsLineText(mtg, "ONE • EN Jesper Ejsing"));
  assert.ok(!acceptsLineText(mtg, "0123 R"));
  assert.ok(!acceptsLineText(mtg, "Jesper Ejsing"));
  assert.ok(acceptsLineText(languageRegion("lorcana"), "204/204 · EN · 1"));
  assert.ok(acceptsLineText(languageRegion("pokemon"), "DRI EN 024/182"));
});

test("matching every language reads text on every scan for games with a language region", () => {
  const settings = { ocrEnabled: true, highAccuracyScans: false };
  assert.ok(readsPrintedLanguageEveryScan({ matchAllLanguages: true }, "mtg"));
  assert.ok(!readsPrintedLanguageEveryScan({ matchAllLanguages: false }, "mtg"));
  assert.ok(!readsPrintedLanguageEveryScan({ matchAllLanguages: true }, "fab"));
  assert.equal(scanOcrMode(settings, true, true), "every-scan");
  assert.equal(scanOcrMode(settings, true, false), "when-unsure");
  assert.equal(scanOcrMode({ ocrEnabled: false }, true, true), "off");
});

test("a text match in the printed language replaces a confident image match in another language", () => {
  assert.ok(
    prefersTextMatch(imageResultInLanguage("en"), { scopedToPrintedLanguage: "de" }),
  );
  assert.ok(
    !prefersTextMatch(imageResultInLanguage("de"), { scopedToPrintedLanguage: "de" }),
  );
  assert.ok(!prefersTextMatch(imageResultInLanguage("en"), {}));
});
