import assert from "node:assert/strict";
import { test } from "node:test";
import {
  OWNED_CARD_SEARCH_DEFAULT_LIMIT,
  OWNED_CARD_SEARCH_MAX_LIMIT,
  OWNED_CARD_SEARCH_QUERY_MAX_LENGTH,
  normalizeOwnedCardSearchQuery,
  ownedCardSearchLimit,
  ownedCardSearchPlacementOf,
  type OwnedCardSearchResult,
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

const ownedResult = (overrides: Partial<OwnedCardSearchResult>): OwnedCardSearchResult => ({
  scanId: "scan",
  collectionGuid: "collection",
  collectionName: "Binder",
  cardName: "Sol Ring",
  setCode: "cmm",
  setName: null,
  collectorNumber: "1",
  imageUrl: null,
  isFoil: false,
  locationGuid: null,
  locationName: null,
  locationPosition: null,
  ...overrides,
});

test("owned card search placement prefers the storage location, then the sorter bin", () => {
  assert.deepEqual(
    ownedCardSearchPlacementOf(ownedResult({ locationName: "Box A", locationPosition: 12, binNumber: 3 })),
    { kind: "location", locationName: "Box A", slot: "12" },
  );
  assert.deepEqual(ownedCardSearchPlacementOf(ownedResult({ locationName: "Box A" })), {
    kind: "location",
    locationName: "Box A",
    slot: null,
  });
  assert.deepEqual(ownedCardSearchPlacementOf(ownedResult({ binNumber: 3 })), { kind: "bin", binNumber: 3 });
  assert.equal(ownedCardSearchPlacementOf(ownedResult({})), null);
});
