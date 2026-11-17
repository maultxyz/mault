import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createScanRemovalEntry,
  resolveRemovalBinNumber,
  scanIdsToRemove,
  scanRemovalCandidateCardIds,
  selectableRemovalCopies,
  SCAN_REMOVAL_MAX_CANDIDATES,
  type BinConfig,
  type PlayingCardWithDistance,
  type ScannedCard,
  type ScanRemovalEntry,
} from "@magic-vault/shared";

function makeCard(id: string): PlayingCardWithDistance {
  return { id, name: id, distance: 0 } as PlayingCardWithDistance;
}

function makeCopy(scanId: string, cardId: string): ScannedCard {
  return { scanId, card: makeCard(cardId), scannedAt: 0 };
}

test("candidate ids keep match order, drop duplicates and cap the list", () => {
  const alternatives = Array.from({ length: 20 }, (_, i) => makeCard(`alt-${i}`));
  const ids = scanRemovalCandidateCardIds(makeCard("top"), [makeCard("top"), ...alternatives]);
  assert.equal(ids[0], "top");
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.length, SCAN_REMOVAL_MAX_CANDIDATES);
});

test("each scan of the same card queues a different copy", () => {
  const copies = [makeCopy("a", "bolt"), makeCopy("b", "bolt")];
  const entries: ScanRemovalEntry[] = [];
  for (const entryId of ["1", "2", "3"]) {
    entries.push(
      createScanRemovalEntry({ entryId, matchedCard: makeCard("bolt"), copies, existingEntries: entries }),
    );
  }
  assert.deepEqual(entries.map((entry) => entry.selectedScanId), ["a", "b", null]);
  assert.deepEqual(scanIdsToRemove(entries).sort(), ["a", "b"]);
});

test("a row can pick any copy not already queued by another row", () => {
  const copies = [makeCopy("a", "bolt"), makeCopy("b", "bolt"), makeCopy("c", "bolt")];
  const first = createScanRemovalEntry({ entryId: "1", matchedCard: makeCard("bolt"), copies, existingEntries: [] });
  const second = createScanRemovalEntry({ entryId: "2", matchedCard: makeCard("bolt"), copies, existingEntries: [first] });
  const selectable = selectableRemovalCopies(second, [first, second]).map((copy) => copy.scanId);
  assert.deepEqual(selectable, ["b", "c"]);
});

test("removed cards go to the chosen bin, falling back to the catch-all", () => {
  const rules = { id: "root", combinator: "and" as const, conditions: [] };
  const bins: BinConfig[] = [
    { guid: "1", binNumber: 1, rules },
    { guid: "2", binNumber: 2, rules, isDisabled: true },
    { guid: "3", binNumber: 3, rules, isCatchAll: true },
  ];
  assert.equal(resolveRemovalBinNumber(bins, null), 3);
  assert.equal(resolveRemovalBinNumber(bins, 1), 1);
  assert.equal(resolveRemovalBinNumber(bins, 2), 3);
  assert.equal(resolveRemovalBinNumber(bins, 9), 3);
  assert.equal(resolveRemovalBinNumber([], 1), null);
});
