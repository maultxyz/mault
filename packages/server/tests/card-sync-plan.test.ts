import assert from "node:assert/strict";
import { test } from "node:test";
import type { CardSyncPlanInput, CatalogCardRow } from "../src/lib/interfaces/sync-job";
import { planCardSync } from "../src/lib/sync-job/card-sync-plan";
import { sourceDataHashOf } from "../src/lib/sync-job/catalog-row";

const storedCurrent = { embeddingVersion: 2, hasBackEmbedding: false, sourceDataHash: null };

function plan(overrides: Partial<CardSyncPlanInput>) {
  return planCardSync({
    hasImage: true,
    hasBackImage: false,
    stored: storedCurrent,
    forceResync: false,
    wasRecentlyUpdated: false,
    currentEmbeddingVersion: 2,
    reembedsOutdatedEmbeddings: true,
    ...overrides,
  });
}

test("a stored card with a current image vector is skipped", () => {
  assert.equal(plan({}), "skip");
});

test("a new card and a forced resync embed both faces", () => {
  assert.equal(plan({ stored: undefined }), "embedBothFaces");
  assert.equal(plan({ forceResync: true }), "embedBothFaces");
});

test("a card without an image is never embedded", () => {
  assert.equal(plan({ hasImage: false, stored: undefined }), "skip");
  assert.equal(plan({ hasImage: false, forceResync: true }), "skip");
});

test("an image vector from an older normalization is embedded again", () => {
  const stored = { ...storedCurrent, embeddingVersion: 1 };
  assert.equal(plan({ stored }), "embedBothFaces");
  assert.equal(plan({ stored, reembedsOutdatedEmbeddings: false }), "skip");
});

test("a missing back face is embedded on its own", () => {
  assert.equal(plan({ hasBackImage: true }), "embedBackFaceOnly");
  assert.equal(
    plan({ hasBackImage: true, stored: { ...storedCurrent, hasBackEmbedding: true } }),
    "skip",
  );
});

test("a recently updated card is skipped even on a forced resync", () => {
  assert.equal(plan({ forceResync: true, wasRecentlyUpdated: true }), "skip");
});

const row: CatalogCardRow = {
  gameKey: "mtg",
  lang: "en",
  cardId: "card-1",
  name: "Card 1",
  setCode: "tst",
  collectorNumber: "1",
  setName: "Test Set",
  rarity: "rare",
  colorIdentity: ["U"],
  searchText: "card 1",
  imageSmall: null,
  data: { id: "card-1", name: "Card 1", prices: { usd: "1.00" } },
};

test("the source data hash ignores volatile keys only", () => {
  const withNewPrice = { ...row, data: { id: "card-1", name: "Card 1", prices: { usd: "2.00" } } };
  assert.equal(
    sourceDataHashOf(row, { volatileDataKeys: ["prices"] }),
    sourceDataHashOf(withNewPrice, { volatileDataKeys: ["prices"] }),
  );
  assert.notEqual(sourceDataHashOf(row, {}), sourceDataHashOf(withNewPrice, {}));
});

test("the source data hash changes with stored columns and data", () => {
  const hash = sourceDataHashOf(row, { volatileDataKeys: ["prices"] });
  assert.notEqual(sourceDataHashOf({ ...row, setCode: "new" }, { volatileDataKeys: ["prices"] }), hash);
  assert.notEqual(sourceDataHashOf({ ...row, collectorNumber: "2" }, { volatileDataKeys: ["prices"] }), hash);
  assert.notEqual(
    sourceDataHashOf({ ...row, data: { id: "card-1", name: "Renamed", prices: {} } }, { volatileDataKeys: ["prices"] }),
    hash,
  );
});
