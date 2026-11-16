import assert from "node:assert/strict";
import { test } from "node:test";
import { OWNED_CARD_SEARCH_MAX_OFFSET, ownedCardSearchOffset } from "@magic-vault/shared";
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
