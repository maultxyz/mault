import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_SCAN_DESTINATION,
  scanDestinationSortsCards,
  scanDestinationStorageLocationGuid,
} from "@magic-vault/shared";

const LOCATION_GUID = "5b0f3f7e-4f4e-4d0c-9a39-2f9b7b0d1c11";

test("the default destination stores cards without sorting", () => {
  assert.equal(DEFAULT_SCAN_DESTINATION.kind, "storage");
  assert.equal(scanDestinationSortsCards(DEFAULT_SCAN_DESTINATION, false), false);
});

test("a storage destination sends its location with the save", () => {
  const destination = { kind: "storage" as const, storageLocationGuid: LOCATION_GUID };
  assert.equal(scanDestinationSortsCards(destination, false), false);
  assert.equal(scanDestinationStorageLocationGuid(destination, false), LOCATION_GUID);
});

test("a storage destination without a location only adds to the collection", () => {
  assert.equal(scanDestinationStorageLocationGuid(DEFAULT_SCAN_DESTINATION, false), undefined);
});

test("a connected sorter always sorts and never stores", () => {
  const destination = { kind: "storage" as const, storageLocationGuid: LOCATION_GUID };
  assert.equal(scanDestinationSortsCards(destination, true), true);
  assert.equal(scanDestinationStorageLocationGuid(destination, true), undefined);
});

test("the sort destination runs sorting logic", () => {
  assert.equal(scanDestinationSortsCards({ kind: "sort" }, false), true);
  assert.equal(scanDestinationStorageLocationGuid({ kind: "sort" }, false), undefined);
});
