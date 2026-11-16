import assert from "node:assert/strict";
import { test } from "node:test";
import {
  globalSearchGamesFor,
  isGlobalSearchGameSelected,
  OWNED_CARD_SEARCH_MAX_OFFSET,
  ownedCardSearchGameKey,
  ownedCardSearchOffset,
  selectedGlobalSearchGameKey,
} from "@magic-vault/shared";
import { catalogSearchPageLimit } from "../src/lib/card-search/catalog-search-limit";
import { STORED_SEARCH_LIMIT } from "../src/lib/constants/card-search";

test("owned card search offset defaults to the first page and is capped", () => {
  assert.equal(ownedCardSearchOffset(undefined), 0);
  assert.equal(ownedCardSearchOffset("abc"), 0);
  assert.equal(ownedCardSearchOffset("-8"), 0);
  assert.equal(ownedCardSearchOffset("16"), 16);
  assert.equal(ownedCardSearchOffset("999999"), OWNED_CARD_SEARCH_MAX_OFFSET);
});

test("catalog search page limit keeps the full page by default and never exceeds it", () => {
  assert.equal(catalogSearchPageLimit(undefined), STORED_SEARCH_LIMIT);
  assert.equal(catalogSearchPageLimit("0"), STORED_SEARCH_LIMIT);
  assert.equal(catalogSearchPageLimit("8"), 8);
  assert.equal(catalogSearchPageLimit("5000"), STORED_SEARCH_LIMIT);
});

test("owned card search only accepts well-formed game keys", () => {
  assert.equal(ownedCardSearchGameKey(undefined), null);
  assert.equal(ownedCardSearchGameKey(""), null);
  assert.equal(ownedCardSearchGameKey("mtg"), "mtg");
  assert.equal(ownedCardSearchGameKey("Robert'); drop"), null);
});

test("global search narrows games and collections to the selected game", () => {
  const magic = { gameKey: "mtg", gameName: "Magic", lang: "en", collectionGuid: "a" };
  const pokemon = { gameKey: "pokemon", gameName: "Pokemon", lang: "en", collectionGuid: "b" };
  assert.deepEqual(globalSearchGamesFor([magic, pokemon], null), [magic, pokemon]);
  assert.deepEqual(globalSearchGamesFor([magic, pokemon], "pokemon"), [pokemon]);
  assert.equal(selectedGlobalSearchGameKey([magic, pokemon], "pokemon"), "pokemon");
  assert.equal(selectedGlobalSearchGameKey([magic], "pokemon"), null);
  assert.equal(isGlobalSearchGameSelected(null, undefined), true);
  assert.equal(isGlobalSearchGameSelected("mtg", "pokemon"), false);
});
