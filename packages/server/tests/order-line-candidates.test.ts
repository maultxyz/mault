import assert from "node:assert/strict";
import { test } from "node:test";
import type { OrderLineInput } from "@magic-vault/shared";
import {
  groupOrderLineCandidates,
  orderLineCandidateLimits,
  orderLineCandidateOverlapKey,
  takeOrderLineCandidates,
  toOrderLineCandidateRequest,
} from "../src/lib/order-line-candidates";

function line(overrides: Partial<OrderLineInput>): OrderLineInput {
  return {
    name: "Brainstorm",
    setCode: null,
    setName: null,
    collectorNumber: null,
    condition: null,
    isFoil: null,
    quantity: 1,
    unitPrice: null,
    orderRef: null,
    language: null,
    ...overrides,
  };
}

test("order line candidates: split cards share an overlap key with their front face", () => {
  assert.equal(orderLineCandidateOverlapKey("fire // ice"), "fire");
  assert.equal(orderLineCandidateOverlapKey("fire"), "fire");
});

test("order line candidates: limits add the missing copies of earlier overlapping lines", () => {
  assert.deepEqual(
    orderLineCandidateLimits([
      { normalizedName: "fire // ice", missing: 2 },
      { normalizedName: "brainstorm", missing: 3 },
      { normalizedName: "fire", missing: 1 },
      { normalizedName: "fire", missing: 0 },
      { normalizedName: "fire // ice", missing: 4 },
    ]),
    [2, 3, 3, 0, 7],
  );
});

test("order line candidates: requests keep the filters the old per-line query used", () => {
  assert.deepEqual(
    toOrderLineCandidateRequest(
      line({ name: "  Fire // Ice ", setCode: "MH2", setName: "Modern Horizons 2", collectorNumber: "290A", condition: "LP", isFoil: false }),
      4,
      9,
    ),
    {
      line_index: 4,
      name: "fire // ice",
      set_code: "mh2",
      set_name: null,
      collector_number: "290a",
      condition: "LP",
      is_foil: false,
      candidate_limit: 9,
    },
  );
  assert.deepEqual(
    toOrderLineCandidateRequest(line({ setName: "Ice Age!" }), 0, 1),
    {
      line_index: 0,
      name: "brainstorm",
      set_code: null,
      set_name: "iceage",
      collector_number: null,
      condition: null,
      is_foil: null,
      candidate_limit: 1,
    },
  );
  assert.equal(toOrderLineCandidateRequest(line({ setName: "!!" }), 0, 1).set_name, null);
});

test("order line candidates: rows group per line in query order", () => {
  const grouped = groupOrderLineCandidates([
    { line_index: 0, scan_id: "a" },
    { line_index: 2, scan_id: "c" },
    { line_index: 0, scan_id: "b" },
  ]);
  assert.deepEqual(grouped.get(0), ["a", "b"]);
  assert.deepEqual(grouped.get(2), ["c"]);
  assert.equal(grouped.get(1), undefined);
});

test("order line candidates: taking skips copies claimed earlier and stops at the missing count", () => {
  assert.deepEqual(
    takeOrderLineCandidates(["a", "b", "c", "d"], new Set(["b"]), 2),
    ["a", "c"],
  );
  assert.deepEqual(takeOrderLineCandidates(["a"], new Set(), 3), ["a"]);
});

test("order line candidates: batched allocation matches the sequential per-line allocation", () => {
  const cardNames = ["fire // ice", "brainstorm", "fire", "opt", "ice"];
  let seed = 7;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let round = 0; round < 200; round += 1) {
    const copies = Array.from({ length: 30 }, (_, index) => ({
      scanId: `copy-${index}`,
      lowerName: cardNames[Math.floor(random() * cardNames.length)],
    }));
    const matches = (copy: (typeof copies)[number], name: string) =>
      copy.lowerName === name || copy.lowerName.split(" // ")[0] === name;
    const lines = Array.from({ length: 6 }, () => ({
      name: ["fire // ice", "fire", "ice", "brainstorm", "opt"][Math.floor(random() * 5)],
      missing: Math.floor(random() * 4),
    }));
    const initialExcluded = new Set(
      copies.filter(() => random() < 0.2).map((copy) => copy.scanId),
    );

    const sequentialExcluded = new Set(initialExcluded);
    const sequential = lines.map((entry) => {
      if (entry.missing <= 0) return [];
      const found = copies
        .filter((copy) => matches(copy, entry.name) && !sequentialExcluded.has(copy.scanId))
        .slice(0, entry.missing)
        .map((copy) => copy.scanId);
      for (const id of found) sequentialExcluded.add(id);
      return found;
    });

    const limits = orderLineCandidateLimits(
      lines.map((entry) => ({ normalizedName: entry.name, missing: entry.missing })),
    );
    const batchedExcluded = new Set(initialExcluded);
    const fetched = lines.map((entry, index) =>
      copies
        .filter((copy) => matches(copy, entry.name) && !initialExcluded.has(copy.scanId))
        .slice(0, limits[index])
        .map((copy) => copy.scanId),
    );
    const batched = lines.map((entry, index) => {
      if (entry.missing <= 0) return [];
      const found = takeOrderLineCandidates(fetched[index], batchedExcluded, entry.missing);
      for (const id of found) batchedExcluded.add(id);
      return found;
    });

    assert.deepEqual(batched, sequential);
  }
});
