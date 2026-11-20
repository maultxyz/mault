import assert from "node:assert/strict";
import { test } from "node:test";
import { EMPTY_CARD_FILTERS } from "@magic-vault/shared";
import {
  cardStatsRefreshSpacingMs,
  storedCardStatsAreFresh,
} from "../src/lib/collection-card-stats";
import {
  COLLECTION_CARD_STATS_MAX_AGE_MS,
  COLLECTION_CARD_STATS_MINIMUM_MS_BETWEEN_REFRESHES,
} from "../src/lib/constants/collection-read-caches";
import type { StoredCardStats } from "../src/lib/interfaces/collections";
import { isUnfilteredCardsQuery } from "../src/routes/collections/cards-query";

const stored: StoredCardStats = {
  stats: {} as StoredCardStats["stats"],
  pricingKey: "pricing",
  computeDurationMs: 40,
  ageMs: 1_000,
  isDirty: false,
};

test("stored collection stats: fresh only while clean, recent and priced the same way", () => {
  assert.equal(storedCardStatsAreFresh(stored, "pricing"), true);
  assert.equal(storedCardStatsAreFresh({ ...stored, isDirty: true }, "pricing"), false);
  assert.equal(storedCardStatsAreFresh(stored, "other pricing"), false);
  assert.equal(
    storedCardStatsAreFresh({ ...stored, ageMs: COLLECTION_CARD_STATS_MAX_AGE_MS }, "pricing"),
    false,
  );
});

test("stored collection stats: slow refreshes are spaced further apart", () => {
  assert.equal(cardStatsRefreshSpacingMs(40), COLLECTION_CARD_STATS_MINIMUM_MS_BETWEEN_REFRESHES);
  assert.equal(cardStatsRefreshSpacingMs(10_000), 100_000);
});

test("stored collection stats: only an unfiltered query reads the stored snapshot", () => {
  const unfiltered = { search: "", sort: "name", filters: EMPTY_CARD_FILTERS, grouped: true, unreviewed: false };
  assert.equal(isUnfilteredCardsQuery(unfiltered), true);
  assert.equal(isUnfilteredCardsQuery({ ...unfiltered, search: "bolt" }), false);
  assert.equal(isUnfilteredCardsQuery({ ...unfiltered, unreviewed: true }), false);
  assert.equal(
    isUnfilteredCardsQuery({ ...unfiltered, filters: { ...EMPTY_CARD_FILTERS, sets: ["mkm"] } }),
    false,
  );
  assert.equal(
    isUnfilteredCardsQuery({ ...unfiltered, filters: { ...EMPTY_CARD_FILTERS, hideDownloaded: true } }),
    false,
  );
});
