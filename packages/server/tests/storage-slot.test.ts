import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildStoragePlanRows,
  binStackLastSlot,
  claimStorageBatchStart,
  storageLocationBinRoom,
  planBinStackSlots,
  formatStorageSlot,
  moveStoragePlanLocation,
  presetsUsingStorageLocation,
  storagePlanBinClaims,
  summarizeStoragePlan,
  formatStorageSlotCode,
  nextFillLocation,
  storageLocationRemainingSlots,
  storageLocationSeriesNames,
  storageSlotParts,
} from "@magic-vault/shared";

test("slots split into batch and card numbers at the batch boundary", () => {
  assert.deepEqual(storageSlotParts(1, 50), { batch: 1, cardInBatch: 1 });
  assert.deepEqual(storageSlotParts(50, 50), { batch: 1, cardInBatch: 50 });
  assert.deepEqual(storageSlotParts(51, 50), { batch: 2, cardInBatch: 1 });
  assert.deepEqual(storageSlotParts(4000, 50), { batch: 80, cardInBatch: 50 });
  assert.equal(storageSlotParts(17, null), null);
  assert.equal(storageSlotParts(0, 50), null);
});

test("slot codes read Box-Batch-Card and fall back to the plain slot", () => {
  assert.equal(formatStorageSlotCode("A1", 67, 50), "A1-2-17");
  assert.equal(formatStorageSlotCode("A1", 67, null), "A1-67");
  assert.equal(formatStorageSlot(67, 50), "2-17");
  assert.equal(formatStorageSlot(67, undefined), "67");
});

test("remaining slots count from the highest slot used", () => {
  assert.equal(storageLocationRemainingSlots({ capacity: 50, usedSlots: 45 }), 5);
  assert.equal(storageLocationRemainingSlots({ capacity: 50, usedSlots: 53 }), 0);
  assert.equal(storageLocationRemainingSlots({ capacity: null, usedSlots: 45 }), null);
});

test("each bin claims the next listed location with room that no other bin holds", () => {
  const locations = [
    { id: 1, capacity: 50, usedSlots: 50 },
    { id: 2, capacity: 50, usedSlots: 45 },
    { id: 3, capacity: 50, usedSlots: 0 },
  ];
  assert.equal(nextFillLocation(locations, new Set())?.id, 2);
  assert.equal(nextFillLocation(locations, new Set([2]))?.id, 3);
  assert.equal(nextFillLocation(locations, new Set([2, 3])), null);
  assert.equal(nextFillLocation([{ id: 4, capacity: null, usedSlots: 900 }], new Set())?.id, 4);
});

test("series names count up from the first number", () => {
  assert.deepEqual(storageLocationSeriesNames(" A ", 1, 3), ["A1", "A2", "A3"]);
  assert.deepEqual(storageLocationSeriesNames("Box ", 9, 2), ["Box9", "Box10"]);
});

test("storage plan rows mark full, filling and waiting locations in list order", () => {
  const location = (guid: string, usedSlots: number, capacity: number | null) => ({
    guid,
    name: guid.toUpperCase(),
    cardCount: usedSlots,
    totalValue: 0,
    lastUsedAt: null,
    createdAt: new Date(0),
    capacity,
    usedSlots,
  });
  const rows = buildStoragePlanRows(
    ["a1", "a2", "gone", "a3"],
    [location("a1", 50, 50), location("a2", 31, 50), location("a3", 0, null)],
    [{ binNumber: 1, claimedStorageLocation: { guid: "a2", name: "A2", capacity: 50, remainingSlots: 19 } }],
  );
  assert.deepEqual(
    rows.map((row) => [row.order, row.location.guid, row.status, row.fillingBinNumber, row.fillPercent]),
    [
      [1, "a1", "full", null, 100],
      [2, "a2", "filling", 1, 62],
      [3, "a3", "waiting", null, null],
    ],
  );
  assert.deepEqual(summarizeStoragePlan(rows), { total: 3, full: 1, firstName: "A1", lastName: "A3" });
  assert.deepEqual(moveStoragePlanLocation(["a", "b", "c"], 0, 1), ["b", "a", "c"]);
  assert.deepEqual(moveStoragePlanLocation(["a", "b"], 0, -1), ["a", "b"]);
});

test("presets using a location list where it sits in each plan and which bin fills it", () => {
  const preset = (guid: string, name: string, isActive: boolean, fill: string[], claimedGuid?: string) => ({
    guid,
    name,
    isActive,
    game: { name: "Magic" } as never,
    fillStorageLocationGuids: fill,
    bins: [
      { guid: "b", binNumber: 2, rules: { id: "r", combinator: "and" as const, conditions: [] }, claimedStorageLocation: claimedGuid ? { guid: claimedGuid, name: "A2", capacity: 50, remainingSlots: 3 } : null },
    ],
  });
  const uses = presetsUsingStorageLocation(
    [
      preset("p1", "Zeta", false, ["a1", "a2"]),
      preset("p2", "Alpha", false, ["a3"]),
      preset("p3", "Bulk", true, ["a2"], "a2"),
    ],
    "a2",
  );
  assert.deepEqual(
    uses.map((use) => [use.presetName, use.isActive, use.planPosition, use.planLength, use.fillingBinNumber]),
    [
      ["Bulk", true, 1, 1, 2],
      ["Zeta", false, 2, 2, null],
    ],
  );
});

test("the catch-all and disabled bins never show a storage location", () => {
  const claim = { guid: "a1", name: "A1", capacity: 50, remainingSlots: 5 };
  assert.deepEqual(
    storagePlanBinClaims([
      { binNumber: 3, isCatchAll: true, isDisabled: false, claimedStorageLocation: claim },
      { binNumber: 2, isCatchAll: false, isDisabled: true, claimedStorageLocation: null },
      { binNumber: 1, isCatchAll: false, isDisabled: false, claimedStorageLocation: claim },
    ]),
    [{ binNumber: 1, locationName: "A1", remainingSlots: 5 }],
  );
});

test("a card scanned after a batch separator starts a new storage batch", () => {
  const stack = (flags: boolean[]) => flags.map((startsStorageBatch) => ({ startsStorageBatch }));
  assert.deepEqual(planBinStackSlots(stack([false, true, false, false]), 0, 5), [1, 2, 6, 7]);
  assert.deepEqual(planBinStackSlots(stack([true, false]), 3, 5), [4, 6]);
  assert.deepEqual(planBinStackSlots(stack([false, false, false, false, true, false]), 0, 5), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(planBinStackSlots(stack([true, false]), 0, null), [1, 2]);
  assert.deepEqual(planBinStackSlots(stack([false, true]), 0, 5), [1, 2]);
});

test("the last stack slot matches the slot planner for any break layout", () => {
  let seed = 7;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let run = 0; run < 500; run++) {
    const cardCount = 1 + Math.floor(random() * 30);
    const batchSize = random() < 0.2 ? null : 1 + Math.floor(random() * 8);
    const usedSlots = Math.floor(random() * 20);
    const starts = Array.from({ length: cardCount }, (_, index) => index).filter(() => random() < 0.2);
    const newestFirst = Array.from({ length: cardCount }, (_, position) => ({
      startsStorageBatch: starts.includes(cardCount - 1 - position),
    }));
    const planned = planBinStackSlots(newestFirst, usedSlots, batchSize);
    assert.equal(binStackLastSlot(cardCount, starts, usedSlots, batchSize), planned[planned.length - 1]);
  }
});

test("a bin's storage room leaves space for the slots a batch break skips", () => {
  const location = { capacity: 100, remainingSlots: 100, batchSize: 10, usedSlots: 0 };
  assert.equal(storageLocationBinRoom(location, []), 100);
  assert.equal(storageLocationBinRoom(location, [3]), 93);
  assert.equal(storageLocationBinRoom({ ...location, batchSize: null }, [3]), 100);
  assert.equal(storageLocationBinRoom({ capacity: null, remainingSlots: null }, [3]), null);
  assert.equal(storageLocationBinRoom({ ...location, remainingSlots: 40, usedSlots: 60 }, [3]), 33);
});

test("claiming a pending batch start records the card's place in the stack once", () => {
  const awaiting = new Set([2]);
  const starts = new Map<number, number[]>([[2, [1]]]);
  claimStorageBatchStart(awaiting, starts, 2, 4);
  claimStorageBatchStart(awaiting, starts, 2, 5);
  claimStorageBatchStart(awaiting, starts, 3, 0);
  assert.deepEqual(starts.get(2), [1, 4]);
  assert.equal(starts.has(3), false);
});
