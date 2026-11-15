import assert from "node:assert/strict";
import { test } from "node:test";
import {
  autoAssignOrderBins,
  buildOrderSortPresetBins,
  hasEveryOrderBin,
  orderBinsError,
  orderRefsOf,
  orderSortPresetGameKeys,
  pickOrderGroups,
  resolveScanBin,
  type BinConfig,
  type OrderLine,
  type PlayingCard,
  type PullSheetEntry,
  type ScanRoutingContext,
} from "@magic-vault/shared";

function line(name: string, orderRef: string | null, allocations: string[], quantity = allocations.length || 1): OrderLine {
  return { name, quantity, orderRef, allocations, picked: [] };
}

function entry(scanId: string, lineIndex: number, name: string, gameKey = "mtg"): PullSheetEntry {
  return {
    scanId,
    lineIndex,
    card: { name } as PlayingCard,
    isFoil: false,
    condition: "NM",
    collectionGuid: "collection",
    collectionName: "Stock",
    binNumber: null,
    locationName: "Box A",
    locationPosition: 0,
    picked: false,
    orderRef: null,
    gameKey,
  };
}

const lines = [
  line("Sol Ring", "1001", ["a"]),
  line("Sol Ring", "1002", ["b", "c"]),
  line("Counterspell", null, ["d"]),
  line("Lightning Bolt", "1001", [], 2),
];
const pullSheet = [entry("b", 1, "Sol Ring"), entry("a", 0, "Sol Ring"), entry("d", 2, "Counterspell"), entry("c", 1, "Sol Ring")];

test("order picking: groups lines and pulled copies by order, unassigned last", () => {
  const groups = pickOrderGroups(lines, pullSheet, { "1001": 1, "1002": 2 });
  assert.deepEqual(
    groups.map((group) => [group.orderRef, group.binNumber, group.lineIndexes, group.entries.map((e) => e.scanId), group.quantity, group.allocated]),
    [
      ["1001", 1, [0, 3], ["a"], 3, 1],
      ["1002", 2, [1], ["b", "c"], 2, 2],
      [null, null, [2], ["d"], 1, 1],
    ],
  );
});

test("order picking: auto-assign keeps valid bins and fills the rest below the catch-all", () => {
  assert.deepEqual(autoAssignOrderBins(["1001", "1002", "1003"], { "1002": 1, "1003": 5 }, 5), {
    "1002": 1,
    "1001": 2,
    "1003": 3,
  });
  assert.deepEqual(autoAssignOrderBins(["a", "b", "c"], {}, 3), { a: 1, b: 2 });
});

test("order picking: bins must be unique, in range and leave the catch-all free", () => {
  assert.equal(orderBinsError({ a: 1, b: 2 }, 5), null);
  assert.equal(orderBinsError({ a: 1, b: 1 }, 5), "duplicate");
  assert.equal(orderBinsError({ a: 6 }, 5), "outOfRange");
  assert.equal(orderBinsError({ a: 0 }, 5), "outOfRange");
  assert.equal(orderBinsError({ a: 5 }, 5), "catchAll");
  assert.equal(hasEveryOrderBin(orderRefsOf(lines), { "1001": 1 }), false);
  assert.equal(hasEveryOrderBin(orderRefsOf(lines), { "1001": 1, "1002": 2 }), true);
  assert.equal(hasEveryOrderBin([], {}), false);
});

test("order picking: the sort preset has one pick-list bin per order and a catch-all", () => {
  const groups = pickOrderGroups(lines, [...pullSheet, entry("e", 1, "Pikachu", "pokemon")], { "1001": 1, "1002": 3 });
  assert.deepEqual(orderSortPresetGameKeys(groups), ["mtg", "pokemon"]);
  const bins = buildOrderSortPresetBins(groups, "mtg", 5);
  assert.deepEqual(
    bins.map((bin) => [bin.binNumber, bin.isCatchAll, bin.pickList?.entries ?? null]),
    [
      [1, false, [{ name: "Sol Ring", quantity: 1, found: 0 }]],
      [2, false, null],
      [3, false, [{ name: "Sol Ring", quantity: 2, found: 0 }]],
      [4, false, null],
      [5, true, null],
    ],
  );
  assert.equal(bins[0].pickList?.mode, "until_found");
});

test("order picking: a card from the batch routes to its order's bin until that order is complete", () => {
  const groups = pickOrderGroups(lines, pullSheet, { "1001": 1, "1002": 2 });
  const configs: BinConfig[] = buildOrderSortPresetBins(groups, "mtg", 3).map((bin) => ({
    guid: `bin-${bin.binNumber}`,
    binNumber: bin.binNumber,
    isCatchAll: bin.isCatchAll,
    pickList: bin.pickList,
    rules: { id: `rules-${bin.binNumber}`, combinator: "and", conditions: [] },
  }));
  const context = {
    binSet: null,
    configs,
    fieldDefinitions: [],
    binContents: [],
    countCardsInBin: () => 0,
    isBinFull: () => false,
    binRoom: () => Infinity,
    createRuleId: () => "new-rule",
  } as ScanRoutingContext;
  const first = resolveScanBin({ name: "Sol Ring" }, context);
  assert.equal(first.action === "route" && first.bin?.binNumber, 1);
  configs[0].pickList!.entries[0].found = 1;
  const second = resolveScanBin({ name: "Sol Ring" }, context);
  assert.equal(second.action === "route" && second.bin?.binNumber, 2);
  const other = resolveScanBin({ name: "Counterspell" }, context);
  assert.equal(other.action === "route" && other.bin?.binNumber, 3);
});

test("order picking: moving a line to another order keeps its allocated copies", async () => {
  const { carryOverOrderAllocations } = await import("../src/lib/orders");
  const previous = [line("Sol Ring", "1001", ["a"]), line("Sol Ring", "1002", ["b"])];
  const carried = carryOverOrderAllocations(
    [
      { name: "Sol Ring", quantity: 1, orderRef: "1003" },
      { name: "Sol Ring", quantity: 1, orderRef: "1001" },
    ],
    previous,
    { keepPreviousUnitPrices: false },
  );
  assert.deepEqual(carried.map((l) => l.allocations), [["b"], ["a"]]);
});

test("order picking: combining imported orders tags every line with its order", async () => {
  const { combineOrdersIntoPick } = await import("@magic-vault/shared");
  assert.deepEqual(
    combineOrdersIntoPick([
      { reference: "1001", lines: [{ name: "Sol Ring", quantity: 1 }] },
      { reference: " 1002 ", lines: [{ name: "Sol Ring", quantity: 2 }] },
      { reference: null, lines: [{ name: "Island", quantity: 4 }] },
    ]),
    [
      { name: "Sol Ring", quantity: 1, orderRef: "1001" },
      { name: "Sol Ring", quantity: 2, orderRef: "1002" },
      { name: "Island", quantity: 4, orderRef: null },
    ],
  );
});
