import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyPickListFound,
  autoAssignOrderBins,
  buildOrderSortPresetBins,
  buildPickWalk,
  buildSorterPickPresetBins,
  findPickListEntry,
  formatDecklist,
  fullyPickedOrders,
  normalizePickListEntries,
  parseDecklist,
  pickWalkStops,
  sorterPickScanIds,
  withOrderPicks,
  type FulfilmentOrderDetail,
  hasEveryOrderBin,
  IMPLICIT_ORDER_REF,
  orderBinsError,
  orderRefsOf,
  orderSortPresetGameKeys,
  orderSortRefsOf,
  pickOrderGroups,
  resolveScanBin,
  type BinConfig,
  type OrderLine,
  type PickList,
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
    locationGuid: null,
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
  // a pick without order references needs only the implicit whole-order bin
  assert.equal(hasEveryOrderBin([], {}), true);
  assert.equal(hasEveryOrderBin(orderSortRefsOf(lines), { "1001": 1, "1002": 2 }), false);
  assert.equal(
    hasEveryOrderBin(orderSortRefsOf(lines), { "1001": 1, "1002": 2, [IMPLICIT_ORDER_REF]: 3 }),
    true,
  );
});

test("order picking: the sort preset has one pick-list bin per order and a catch-all", () => {
  const groups = pickOrderGroups(lines, [...pullSheet, entry("e", 1, "Pikachu", "pokemon")], { "1001": 1, "1002": 3 });
  assert.deepEqual(orderSortPresetGameKeys(groups), ["mtg", "pokemon"]);
  const bins = buildOrderSortPresetBins(groups, "mtg", 5);
  assert.deepEqual(
    bins.map((bin) => [bin.binNumber, bin.isCatchAll, bin.pickList?.entries ?? null]),
    [
      [1, false, [{ name: "Sol Ring", quantity: 1, found: 0, isFoil: false }]],
      [2, false, null],
      [3, false, [{ name: "Sol Ring", quantity: 2, found: 0, isFoil: false }]],
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

test("order picking: pick lists match the closest printing and reject conflicting ones", () => {
  const pickList: PickList = {
    mode: "until_found",
    entries: [
      {
        name: "Sol Ring",
        quantity: 1,
        found: 0,
        setCode: "m10",
        collectorNumber: "1",
        isFoil: false,
      },
      { name: "Sol Ring", quantity: 2, found: 0 },
    ],
  };
  const scan = (set?: string, collector?: string, isFoil?: boolean) => ({
    name: "Sol Ring",
    setCode: set ?? null,
    collectorNumber: collector ?? null,
    isFoil: isFoil ?? null,
  });
  // the exact printing wins over the unspecified copy
  assert.equal(findPickListEntry(scan("m10", "1"), pickList)?.setCode, "m10");
  // a different printing falls back to the unspecified entry
  assert.equal(findPickListEntry(scan("ddb", "2"), pickList)?.setCode, undefined);
  // a name-only scan matches the unspecified entry
  assert.equal(findPickListEntry({ name: "Sol Ring" }, pickList)?.setCode, undefined);
  // a foil copy falls to the unspecified entry, not the non-foil one
  assert.equal(findPickListEntry(scan("m10", "1", true), pickList)?.setCode, undefined);
  // a conflicting scan never fills the only entry
  const strict: PickList = {
    mode: "until_found",
    entries: [{ name: "Sol Ring", quantity: 2, found: 0, setCode: "m10" }],
  };
  assert.equal(findPickListEntry(scan("ddb", "2"), strict), undefined);
  assert.equal(findPickListEntry({ name: "Sol Ring" }, strict)?.setCode, "m10");
  // found counts target the entry they matched
  assert.equal(applyPickListFound(pickList, scan("m10", "1"), 1)?.entries[0]?.found, 1);
  assert.equal(applyPickListFound(pickList, { name: "Sol Ring" }, 1)?.entries[1]?.found, 1);
});

test("order picking: pick lists with different printings of a card stay separate entries", () => {
  assert.deepEqual(
    normalizePickListEntries([
      { name: "Sol Ring", quantity: 1, setCode: "m10" },
      { name: "Sol Ring", quantity: 1 },
      { name: "Sol Ring", quantity: 1, setCode: "m10" },
    ]),
    [
      { name: "Sol Ring", quantity: 2, setCode: "m10" },
      { name: "Sol Ring", quantity: 1 },
    ],
  );
});

test("order picking: the sorter routes each printing to its own bin and puts conflicting cards back", () => {
  const printingCard = (set: string, collector: string): PlayingCard =>
    ({ name: "Sol Ring", set, collectorNumber: collector }) as PlayingCard;
  const groups = pickOrderGroups(
    [line("Sol Ring", "1001", ["a"]), line("Sol Ring", "1002", ["b"])],
    [
      { ...entry("a", 0, "Sol Ring"), card: printingCard("m10", "1") },
      { ...entry("b", 1, "Sol Ring"), card: printingCard("ddb", "2") },
    ],
    { "1001": 1, "1002": 2 },
  );
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
  const first = resolveScanBin({ name: "Sol Ring", set: "m10", collectorNumber: "1" }, context);
  assert.equal(first.action === "route" && first.bin?.binNumber, 1);
  configs[0].pickList!.entries[0].found = 1;
  // the ddb copy the second order wants still reaches bin 2
  const wanted = resolveScanBin({ name: "Sol Ring", set: "ddb", collectorNumber: "2" }, context);
  assert.equal(wanted.action === "route" && wanted.bin?.binNumber, 2);
  configs[1].pickList!.entries[0].found = 1;
  // an extra m10 copy nobody wants falls to the catch-all instead of filling a pick
  const extra = resolveScanBin({ name: "Sol Ring", set: "m10", collectorNumber: "1" }, context);
  assert.equal(extra.action === "route" && extra.bin?.isCatchAll, true);
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

function order(guid: string, lines: OrderLine[], pullSheet: PullSheetEntry[], status: FulfilmentOrderDetail["status"] = "open"): FulfilmentOrderDetail {
  return {
    guid,
    name: `Pick ${guid}`,
    source: "generic",
    status,
    lineCount: lines.length,
    quantity: lines.length,
    allocated: pullSheet.length,
    picked: 0,
    revenue: null,
    createdAt: "",
    closedAt: null,
    createdByName: null,
    lines,
    pullSheet,
    orderBins: { "#1": 3 },
    binCount: 9,
  };
}

test("walks open picks by location, then position, with unlocated cards last", () => {
  const binder = { ...entry("b1", 0, "Bolt"), locationName: null, binNumber: 2 };
  const late = { ...entry("a2", 0, "Opt"), locationPosition: 7, orderRef: "#1" };
  const early = { ...entry("a1", 1, "Ponder"), locationPosition: 2 };
  const walk = buildPickWalk([
    order("x", [line("Bolt", null, ["b1", "a2"]), line("Ponder", null, ["a1"])], [binder, late, early]),
    order("closed", [line("Opt", null, ["c1"])], [entry("c1", 0, "Opt")], "fulfilled"),
  ]);
  assert.deepEqual(walk.map((item) => item.scanId), ["a1", "a2", "b1"]);
  assert.equal(walk[1].orderBin, 3);
  assert.equal(walk[0].orderName, "Pick x");
  const stops = pickWalkStops(walk);
  assert.deepEqual(stops.map((stop) => [stop.locationName, stop.binNumber, stop.entries.length]), [
    ["Box A", null, 2],
    [null, 2, 1],
  ]);
});

test("marks picks on an order and finds fully picked orders", () => {
  const detail = order("x", [line("Bolt", null, ["a1", "a2"], 2)], [entry("a1", 0, "Bolt"), entry("a2", 0, "Bolt")]);
  const partly = withOrderPicks(detail, new Set(["a1"]), true);
  assert.equal(partly.picked, 1);
  assert.deepEqual(partly.lines[0].picked, ["a1"]);
  assert.deepEqual(fullyPickedOrders([partly], new Set(["a1"])), []);
  assert.deepEqual(fullyPickedOrders([partly], new Set(["a1", "a2"])).map((item) => item.guid), ["x"]);
  assert.equal(withOrderPicks(partly, new Set(["a1"]), false).picked, 0);
});

test("merges pick lists when orders in a batch share a sorter bin", () => {
  const first = pickOrderGroups(
    [line("Sol Ring", "1001", ["a"])],
    [entry("a", 0, "Sol Ring")],
    { "1001": 1 },
  );
  const second = pickOrderGroups(
    [line("Sol Ring", "1002", ["b", "c"]), line("Opt", "1002", ["d"])],
    [entry("b", 0, "Sol Ring"), entry("c", 0, "Sol Ring"), entry("d", 1, "Opt")],
    { "1002": 1 },
  );
  const bins = buildOrderSortPresetBins([...first, ...second], "mtg", 3);
  assert.deepEqual(bins[0].pickList?.entries, [
    { name: "Sol Ring", quantity: 3, found: 0, isFoil: false },
    { name: "Opt", quantity: 1, found: 0, isFoil: false },
  ]);
  assert.equal(bins[0].isCatchAll, false);
  assert.equal(bins[1].pickList, null);
  assert.equal(bins[2].isCatchAll, true);
});

test("order picking: decklist lines keep their printing data", () => {
  const text = [
    "1 Rayquaza EX [SWSH01: 143]",
    "1 Rayquaza EX [SWSH01 #144]",
    "2 Rayquaza EX (SWSH01) 145",
    "1 Rayquaza EX [SWSH01: 143] *F*",
    "1 Rayquaza EX",
    "1 Bolt #12",
    "4 Lightning Bolt",
    "Deck",
    "// comment",
  ].join("\n");
  const entries = parseDecklist(text);
  // two different printings of Rayquaza EX from the same set stay separate
  assert.deepEqual(entries, [
    { name: "Rayquaza EX", quantity: 1, setCode: "SWSH01", collectorNumber: "143" },
    { name: "Rayquaza EX", quantity: 1, setCode: "SWSH01", collectorNumber: "144" },
    { name: "Rayquaza EX", quantity: 2, setCode: "SWSH01", collectorNumber: "145" },
    { name: "Rayquaza EX", quantity: 1, setCode: "SWSH01", collectorNumber: "143", isFoil: true },
    { name: "Rayquaza EX", quantity: 1 },
    { name: "Bolt", quantity: 1, collectorNumber: "12" },
    { name: "Lightning Bolt", quantity: 4 },
  ]);
  // formatting keeps the printing so the textarea round-trips it
  assert.equal(
    formatDecklist(entries.slice(0, 3)),
    [
      "1 Rayquaza EX [SWSH01: 143]",
      "1 Rayquaza EX [SWSH01: 144]",
      "2 Rayquaza EX [SWSH01: 145]",
    ].join("\n"),
  );
  // same name and printing still merge into one entry
  assert.deepEqual(
    parseDecklist("1 Sol Ring [M10: 1]\n2 Sol Ring [m10:1]"),
    [{ name: "Sol Ring", quantity: 3, setCode: "M10", collectorNumber: "1" }],
  );
});

test("order picking: a pick without order references sorts as one implicit whole-order group", () => {
  const groups = pickOrderGroups(
    [line("Sol Ring", null, ["a"]), line("Opt", null, ["b"])],
    [entry("a", 0, "Sol Ring"), entry("b", 1, "Opt")],
    { [IMPLICIT_ORDER_REF]: 2 },
  );
  assert.deepEqual(orderSortRefsOf([line("Sol Ring", null, ["a"])]), [""]);
  assert.deepEqual(orderSortRefsOf([line("Sol Ring", "1001", ["a"])]), ["1001"]);
  assert.deepEqual(groups.map((group) => [group.orderRef, group.binNumber]), [
    [null, 2],
  ]);
  assert.deepEqual(orderSortPresetGameKeys(groups), ["mtg"]);
  const bins = buildOrderSortPresetBins(groups, "mtg", 4);
  assert.deepEqual(
    bins.map((bin) => [bin.binNumber, bin.isCatchAll, bin.pickList?.entries ?? null]),
    [
      [1, false, null],
      [2, false, [{ name: "Sol Ring", quantity: 1, found: 0, isFoil: false }, { name: "Opt", quantity: 1, found: 0, isFoil: false }]],
      [3, false, null],
      [4, true, null],
    ],
  );
});

test("order picking: the sorter-pick preset only lists the chosen box's cards, catch-all put back last", () => {
  const inBoxA = { ...entry("a", 0, "Sol Ring"), locationGuid: "box-a" };
  const inBoxALater = { ...entry("b", 1, "Sol Ring"), locationGuid: "box-a" };
  const inBoxB = { ...entry("c", 1, "Sol Ring"), locationGuid: "box-b" };
  const loose = { ...entry("d", 2, "Bolt"), locationName: null, locationGuid: null, binNumber: 2 };
  const groups = pickOrderGroups(
    [line("Sol Ring", "1001", ["a"]), line("Sol Ring", "1002", ["b", "c"]), line("Bolt", null, ["d"])],
    [inBoxA, inBoxALater, inBoxB, loose],
    { "1001": 1, "1002": 2 },
  );
  const bins = buildSorterPickPresetBins(groups, "box-a", "mtg", 4);
  assert.deepEqual(
    bins.map((bin) => [bin.binNumber, bin.isCatchAll, bin.pickList?.entries ?? null]),
    [
      [1, false, [{ name: "Sol Ring", quantity: 1, found: 0, isFoil: false }]],
      [2, false, [{ name: "Sol Ring", quantity: 1, found: 0, isFoil: false }]],
      [3, false, null],
      [4, true, null],
    ],
  );
});

test("order picking: sorter results mark the box's unpicked copies by found count", () => {
  const pullSheet = [
    { ...entry("a", 0, "Sol Ring"), locationGuid: "box-a", picked: true },
    { ...entry("b", 1, "Sol Ring"), locationGuid: "box-a" },
    { ...entry("c", 1, "Sol Ring"), locationGuid: "box-a" },
    { ...entry("d", 1, "Sol Ring"), locationGuid: "box-b" },
    { ...entry("e", 2, "Bolt"), locationGuid: "box-a" },
  ];
  // the copy picked by hand before the run leaves the box, so it doesn't consume a found count
  const result = sorterPickScanIds(pullSheet, { "Sol Ring": 2, "Bolt": 0 }, "box-a");
  assert.deepEqual(result.scanIds, ["b", "c"]);
  assert.deepEqual(result.consumedByName, { "Sol Ring": 2 });
  // over-fed counts cap at the copies still in the box
  assert.deepEqual(sorterPickScanIds(pullSheet, { "Sol Ring": 9 }, "box-a").scanIds, ["b", "c"]);
  // another box's copies are untouched
  assert.deepEqual(sorterPickScanIds(pullSheet, { "Sol Ring": 1 }, "box-b"), {
    scanIds: ["d"],
    consumedByName: { "Sol Ring": 1 },
  });
});
