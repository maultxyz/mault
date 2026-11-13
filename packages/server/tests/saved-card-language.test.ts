import assert from "node:assert/strict";
import { test } from "node:test";
import type { PlayingCard } from "@magic-vault/shared";
import { withCollectionLanguage } from "../src/lib/saved-cards";

const card = { id: "sv03-229", name: "Cuencia" } as PlayingCard;

test("a scan without language takes its collection's language", () => {
  assert.equal(withCollectionLanguage(card, "fr").lang, "fr");
});

test("a language saved on the card is kept", () => {
  assert.equal(withCollectionLanguage({ ...card, lang: "en" }, "fr").lang, "en");
});

test("an all-languages collection adds no language", () => {
  assert.equal(withCollectionLanguage(card, "all").lang, undefined);
  assert.equal(withCollectionLanguage(card, null).lang, undefined);
});
