import assert from "node:assert/strict";
import { test } from "node:test";
import {
  findCardForScan,
  parseStoredStoragePickList,
  parseStoredStorageVerify,
  scanCheckCollectionGuid,
  storagePickListEntries,
  storagePickListRows,
  storageVerifyNameCounts,
  type StorageLocationSearchResult,
} from "@magic-vault/shared";

function stored(scanId: string, cardId: string, name: string, collectionGuid = "col-a"): StorageLocationSearchResult {
  return { scanId, collectionGuid, card: { id: cardId, name } } as StorageLocationSearchResult;
}

const cards = [
  stored("s1", "bolt-m10", "Lightning Bolt"),
  stored("s2", "bolt-2x2", "Lightning Bolt"),
  stored("s3", "fire-ice", "Fire // Ice", "col-b"),
];

function matchOf(checked: string[], scanned: { id: string; name: string }) {
  const match = findCardForScan(cards, new Set(checked), scanned);
  return match ? `${match.kind}:${match.card.scanId}` : null;
}

test("scanning prefers the same printing, then any unchecked copy with the name", () => {
  assert.equal(matchOf([], { id: "bolt-2x2", name: "Lightning Bolt" }), "unchecked:s2");
  assert.equal(matchOf(["s2"], { id: "bolt-2x2", name: "Lightning Bolt" }), "unchecked:s1");
});

test("scanning a card whose copies are all checked reports it as already checked", () => {
  assert.equal(matchOf(["s1", "s2"], { id: "bolt-m10", name: "Lightning Bolt" }), "already-checked:s1");
});

test("scanning matches split cards by either face and misses other names", () => {
  assert.equal(matchOf([], { id: "other", name: "Fire" }), "unchecked:s3");
  assert.equal(matchOf([], { id: "other", name: "Shock" }), null);
});

test("scan scope is the collection holding most unchecked cards, then any card's collection", () => {
  assert.equal(scanCheckCollectionGuid(cards, new Set()), "col-a");
  assert.equal(scanCheckCollectionGuid(cards, new Set(["s1", "s2"])), "col-b");
  assert.equal(scanCheckCollectionGuid(cards, new Set(["s1", "s2", "s3"])), "col-a");
  assert.equal(scanCheckCollectionGuid([], new Set()), null);
});

test("stored pick lists and verify sessions fall back to empty on bad data", () => {
  assert.deepEqual(parseStoredStoragePickList("not json"), { decklist: "", pickedScanIds: [] });
  assert.deepEqual(parseStoredStoragePickList('{"decklist":"1 Bolt","pickedScanIds":["s1"],"target":null}'), {
    decklist: "1 Bolt",
    pickedScanIds: ["s1"],
  });
  assert.deepEqual(parseStoredStorageVerify('{"verifiedScanIds":["s1"]}'), {
    verifiedScanIds: [],
    notInLocationCardNames: [],
  });
});

test("decklists merge repeated names", () => {
  assert.deepEqual(storagePickListEntries("2 Lightning Bolt\n1 lightning bolt\nSideboard:\n1 Shock"), [
    { name: "Lightning Bolt", quantity: 3 },
    { name: "Shock", quantity: 1 },
  ]);
});

test("pick list rows put unpicked cards first, then short lines, then picked cards", () => {
  const rows = storagePickListRows(
    [
      { name: "Lightning Bolt", quantity: 3, found: 2 },
      { name: "Fire // Ice", quantity: 1, found: 1 },
    ],
    cards,
    new Set(["s1"]),
  );
  assert.deepEqual(
    rows.map((row) => (row.kind === "card" ? `${row.entry.scanId}:${row.isPicked}` : `missing:${row.missingCount}`)),
    ["s2:false", "s3:false", "missing:1", "s1:true"],
  );
});

test("cards scanned outside the location are counted by name", () => {
  assert.deepEqual(storageVerifyNameCounts(["Shock", "Opt", "Shock"]), [
    { name: "Shock", count: 2 },
    { name: "Opt", count: 1 },
  ]);
});
