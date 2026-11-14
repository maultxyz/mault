import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createScanRemovalEntry,
  type PlayingCardWithDistance,
  type ScannedCard,
} from "@magic-vault/shared";
import { updatePiScanRemovalQueue } from "../src/lib/pi-scan/removal";

function queue() {
  const matchedCard = { id: "printing" } as PlayingCardWithDistance;
  const copies = ["one", "two"].map(
    (scanId) =>
      ({ scanId, card: matchedCard, scannedAt: 1 }) satisfies ScannedCard,
  );
  const first = createScanRemovalEntry({
    entryId: "first",
    matchedCard,
    copies,
    existingEntries: [],
  });
  const second = createScanRemovalEntry({
    entryId: "second",
    matchedCard,
    copies,
    existingEntries: [first],
  });
  return { removalBusy: false, removalEntries: [first, second] };
}

test("host removal selections reuse shared policy and cannot reserve a copy twice or inject ids", async () => {
  const state = queue();
  const noRemove = async () => assert.fail("Selection must not delete a card");
  assert.equal(
    await updatePiScanRemovalQueue(
      state,
      { action: "select", entryId: "first", scanId: "two" },
      noRemove,
    ),
    false,
  );
  assert.equal(
    await updatePiScanRemovalQueue(
      state,
      { action: "select", entryId: "first", scanId: "another-org-scan" },
      noRemove,
    ),
    false,
  );
  assert.equal(
    await updatePiScanRemovalQueue(
      state,
      { action: "drop", entryId: "second" },
      noRemove,
    ),
    true,
  );
  assert.equal(
    await updatePiScanRemovalQueue(
      state,
      { action: "select", entryId: "first", scanId: "two" },
      noRemove,
    ),
    true,
  );
  assert.equal(state.removalEntries[0].selectedScanId, "two");
  assert.equal(state.removalBusy, false);
});

test("a failed authorized removal retains the host queue for retry and successful removal clears it", async () => {
  const state = queue();
  assert.equal(
    await updatePiScanRemovalQueue(state, { action: "remove" }, async (ids) => {
      assert.deepEqual(ids, ["one", "two"]);
      return false;
    }),
    false,
  );
  assert.equal(state.removalEntries.length, 2);
  assert.equal(
    await updatePiScanRemovalQueue(state, { action: "remove" }, async (ids) => {
      assert.deepEqual(ids, ["one", "two"]);
      return true;
    }),
    true,
  );
  assert.deepEqual(state.removalEntries, []);
});

test("in-flight host removal excludes concurrent selection, clear and deletion requests", async () => {
  const state = queue();
  let finish!: (value: boolean) => void;
  const deleting = updatePiScanRemovalQueue(
    state,
    { action: "remove" },
    () =>
      new Promise<boolean>((resolve) => {
        finish = resolve;
      }),
  );
  assert.equal(state.removalBusy, true);
  assert.equal(
    await updatePiScanRemovalQueue(state, { action: "clear" }, async () =>
      assert.fail(),
    ),
    false,
  );
  assert.equal(
    await updatePiScanRemovalQueue(state, { action: "remove" }, async () =>
      assert.fail(),
    ),
    false,
  );
  finish(true);
  assert.equal(await deleting, true);
  assert.equal(state.removalBusy, false);
});
