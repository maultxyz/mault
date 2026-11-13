import assert from "node:assert/strict";
import { test } from "node:test";
import {
  OWNED_CARD_SEARCH_DEFAULT_LIMIT,
  OWNED_CARD_SEARCH_MAX_LIMIT,
  OWNED_CARD_SEARCH_QUERY_MAX_LENGTH,
  normalizeOwnedCardSearchQuery,
  ownedCardSearchLimit,
} from "@magic-vault/shared";

test("owned card search queries are trimmed, lowercased and capped", () => {
  assert.equal(normalizeOwnedCardSearchQuery("  Sting, Bilbo's  "), "sting, bilbo's");
  assert.equal(normalizeOwnedCardSearchQuery(undefined), "");
  assert.equal(normalizeOwnedCardSearchQuery("   "), "");
  assert.equal(normalizeOwnedCardSearchQuery("x".repeat(500)).length, OWNED_CARD_SEARCH_QUERY_MAX_LENGTH);
});

test("owned card search limits fall back to the default and never exceed the maximum", () => {
  assert.equal(ownedCardSearchLimit(undefined), OWNED_CARD_SEARCH_DEFAULT_LIMIT);
  assert.equal(ownedCardSearchLimit("abc"), OWNED_CARD_SEARCH_DEFAULT_LIMIT);
  assert.equal(ownedCardSearchLimit("0"), OWNED_CARD_SEARCH_DEFAULT_LIMIT);
  assert.equal(ownedCardSearchLimit("-4"), OWNED_CARD_SEARCH_DEFAULT_LIMIT);
  assert.equal(ownedCardSearchLimit("12"), 12);
  assert.equal(ownedCardSearchLimit("1000"), OWNED_CARD_SEARCH_MAX_LIMIT);
});
