import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CARD_SEARCH_ALL_LANGUAGES,
  cardSearchLanguageOfCollection,
  cardSearchLanguageOrCollectionDefault,
} from "@magic-vault/shared";

const collections = [
  { guid: "german", lang: "de" },
  { guid: "unknown-language", lang: "xx" },
];

test("card searches start in the collection's language", () => {
  assert.equal(cardSearchLanguageOfCollection(collections, "german"), "de");
});

test("card searches fall back to all languages without a known collection language", () => {
  assert.equal(
    cardSearchLanguageOfCollection(collections, "unknown-language"),
    CARD_SEARCH_ALL_LANGUAGES,
  );
  assert.equal(
    cardSearchLanguageOfCollection(collections, "missing"),
    CARD_SEARCH_ALL_LANGUAGES,
  );
  assert.equal(
    cardSearchLanguageOfCollection(undefined, "german"),
    CARD_SEARCH_ALL_LANGUAGES,
  );
});

test("a search without a language uses the collection's language", () => {
  assert.equal(cardSearchLanguageOrCollectionDefault(undefined, "de"), "de");
  assert.equal(cardSearchLanguageOrCollectionDefault("", "de"), "de");
  assert.equal(cardSearchLanguageOrCollectionDefault(undefined, "xx"), undefined);
});

test("an explicit language or all languages overrides the collection's language", () => {
  assert.equal(cardSearchLanguageOrCollectionDefault("ja", "de"), "ja");
  assert.equal(
    cardSearchLanguageOrCollectionDefault(CARD_SEARCH_ALL_LANGUAGES, "de"),
    undefined,
  );
});
