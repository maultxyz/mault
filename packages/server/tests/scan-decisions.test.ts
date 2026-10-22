import assert from "node:assert/strict";
import { test } from "node:test";
import {
  pickConsensus,
  type PlayingCardWithDistance,
  betterSearch,
  chooseScanBin,
  closeMatchesOf,
  needsTextSearch,
  orderMatchesByColor,
  reservePickListBins,
  scanHoldReason,
  type BinConfig,
  type BinSet,
  type ScanBinDeps,
  type FieldMeta,
  routeForBin,
  consensusAttemptLimit,
  consensusMissReason,
} from "@magic-vault/shared";

function bin(binNumber: number, extra: Partial<BinConfig> = {}): BinConfig {
  return {
    guid: `bin-${binNumber}`,
    binNumber,
    rules: { id: `rules-${binNumber}`, combinator: "and", conditions: [] },
    ...extra,
  };
}
function preset(bins: BinConfig[], extra: Partial<BinSet> = {}): BinSet {
  return {
    guid: "preset",
    name: "Preset",
    isActive: true,
    bins,
    game: null,
    autoAssignField: null,
    scanOnly: false,
    scanOnlyBin: null,
    isRepackMode: false,
    repackSlots: [],
    repackUniqueBy: null,
    repackSiftRules: null,
    repackMultiplePacks: false,
    isAlphabetMode: false,
    alphabetPass: 1,
    alphabetPrefix: "",
    isChaosMode: false,
    chaosBinSize: null,
    skipSaving: false,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...extra,
  };
}
const deps: ScanBinDeps = {
  countCopies: () => 0,
  countInBin: () => 0,
  isBinFull: () => false,
  binRoom: () => Infinity,
  cardsInBin: () => [],
  newId: () => "new-rule",
};

test("orientation chooses a usable match before distance, retaining upright on a tie", () => {
  const upright = { data: [{ distance: 0.3 }], nearestDistance: 0.3 };
  const rotated = { data: [], nearestDistance: 0.1 };
  assert.equal(betterSearch(upright, rotated), upright);
  assert.equal(betterSearch(upright, { ...upright }), upright);
  assert.equal(needsTextSearch({ diagnostics: { reason: "ambiguous" } }), true);
});

test("color preference cannot expand the close-match window", () => {
  const matches = [
    { distance: 0.1, card: { colorIdentity: ["U"] } },
    { distance: 0.14, card: { colorIdentity: ["R"] } },
    { distance: 0.17, card: { colorIdentity: ["R"] } },
  ];
  const ordered = orderMatchesByColor(matches, "R")!;
  assert.equal(ordered[0], matches[1]);
  assert.deepEqual(closeMatchesOf(ordered), [matches[1], matches[0]]);
  assert.equal(matches[0].distance, 0.1);
});

test("consensus counts same-name printings across misses and selects the closest vote", () => {
  const vote = (id: string, name: string, distance: number) => ({
    card: { id, name, distance } as PlayingCardWithDistance,
  });
  const first = vote("printing-1", "A", 0.4);
  const best = vote("printing-2", "A", 0.2);
  assert.equal(pickConsensus([first, { card: null }, best], 2), best);
  assert.equal(pickConsensus([first, vote("other", "B", 0.1)], 2), null);
  assert.equal(pickConsensus([first, vote("distant", "A", 0.71)], 2), null);
  const boundary = vote("boundary", "A", 0.7);
  assert.equal(pickConsensus([first, boundary], 2), first);
});

test("pick lists win before normal rules and auto assignment", () => {
  const bins = [
    bin(1),
    bin(2, {
      pickList: {
        mode: "until_found",
        entries: [{ name: "Lightning Bolt", quantity: 1, found: 0 }],
      },
    }),
    bin(3, { isCatchAll: true }),
  ];
  const choice = chooseScanBin(
    { name: "Lightning Bolt" },
    preset(bins),
    reservePickListBins(bins),
    bins,
    [],
    deps,
  );
  assert.equal(choice.bin?.binNumber, 2);
  assert.equal(choice.pickListName, "Lightning Bolt");
  assert.equal(choice.autoAssign, null);
});

test("scan-only honors its target and reports a full bin as a hold", () => {
  const bins = [bin(1), bin(2), bin(3, { isCatchAll: true })];
  const set = preset(bins, { scanOnly: true, scanOnlyBin: 2 });
  const choice = chooseScanBin({ name: "Card" }, set, bins, bins, [], deps);
  assert.equal(choice.bin?.binNumber, 2);
  assert.equal(
    scanHoldReason({}, set, bins, [], choice.bin, {
      ...deps,
      isBinFull: () => true,
    })?.reason,
    "bin-full",
  );
});

test("chaos holds on full bins and picks the emptied bin after refresh", () => {
  const bins = [bin(1), bin(2), bin(3, { isCatchAll: true })];
  const set = preset(bins, { isChaosMode: true });
  const full = { ...deps, isBinFull: () => true };
  const held = chooseScanBin({}, set, bins, bins, [], full);
  assert.equal(
    scanHoldReason({}, set, bins, [], held.bin, full)?.reason,
    "chaos-full",
  );
  const emptied = {
    ...deps,
    isBinFull: (item: BinConfig) => item.binNumber !== 2,
  };
  const resumed = chooseScanBin({}, set, bins, bins, [], emptied);
  assert.equal(resumed.bin?.binNumber, 2);
  assert.equal(scanHoldReason({}, set, bins, [], resumed.bin, emptied), null);
});

test("matching retains upstream orientation, OCR and retry boundaries", () => {
  const empty = { data: [], nearestDistance: null };
  const matched = { data: [{ distance: 0.4 }], nearestDistance: 0.4 };
  assert.equal(betterSearch(empty, matched), matched);
  assert.equal(
    betterSearch(matched, { ...matched, nearestDistance: 0.3 }).nearestDistance,
    0.3,
  );
  assert.equal(
    needsTextSearch({ data: [{ distance: 0.1 }, { distance: 0.14 }] }),
    true,
  );
  assert.equal(
    needsTextSearch({ data: [{ distance: 0.1 }, { distance: 0.17 }] }),
    false,
  );
  assert.equal(needsTextSearch(empty), false);
  assert.equal(consensusAttemptLimit(3), 6);
  assert.equal(consensusMissReason(true, "ambiguous"), "no_consensus");
  assert.equal(consensusMissReason(false, "ambiguous"), "ambiguous");
  const unsorted = [{ distance: 0.14 }, { distance: 0.1 }, { distance: 0.18 }];
  assert.deepEqual(closeMatchesOf(unsorted, unsorted[0].distance), unsorted);
  assert.deepEqual(closeMatchesOf(unsorted), unsorted.slice(0, 2));
});

test("rules preserve max copies, overflow and learned auto-assignment behavior", () => {
  const fields: FieldMeta[] = [
    {
      field: "name",
      label: "Name",
      type: "string",
      path: "name",
      operators: [],
    },
  ];
  const rules = {
    id: "name-rule",
    combinator: "and" as const,
    conditions: [
      {
        id: "name-condition",
        field: "name",
        operator: "equals" as const,
        value: "Bolt",
      },
    ],
  };
  const bins = [
    bin(1, { rules, maxCopies: 1, overflowBin: 2 }),
    bin(2),
    bin(3, { isCatchAll: true }),
  ];
  const full = {
    ...deps,
    countCopies: () => 1,
    isBinFull: (item: BinConfig) => item.binNumber === 1,
  };
  assert.equal(
    chooseScanBin({ name: "Bolt" }, preset(bins), bins, bins, fields, full).bin
      ?.binNumber,
    2,
  );
  const open = [bin(1), bin(2), bin(3, { isCatchAll: true })];
  const choice = chooseScanBin(
    { name: "Bolt" },
    preset(open, { autoAssignField: "name" }),
    open,
    open,
    fields,
    deps,
  );
  assert.equal(choice.bin?.binNumber, 1);
  assert.deepEqual(choice.autoAssign?.rules.conditions, [
    { id: "new-rule", field: "name", operator: "equals", value: "Bolt" },
  ]);
});

test("low-confidence catch-all takes priority over pick lists and scan-only targets", () => {
  const bins = [
    bin(1, {
      pickList: {
        mode: "until_found",
        entries: [{ name: "Bolt", quantity: 1, found: 0 }],
      },
    }),
    bin(2, { isCatchAll: true, lowMatchPercent: 80 }),
  ];
  for (const options of [
    {},
    { scanOnly: true, scanOnlyBin: 1 },
    { isChaosMode: true },
  ]) {
    const set = preset(bins, options);
    const choice = chooseScanBin(
      { name: "Bolt", distance: 0.5 },
      set,
      bins,
      bins,
      [],
      deps,
    );
    assert.equal(choice.bin?.binNumber, 2);
    assert.equal(choice.pickListName, null);
    assert.equal(
      scanHoldReason({ distance: 0.5 }, set, bins, [], choice.bin, deps),
      null,
    );
  }
});

test("repack completion pauses with ordered pack bins, without learning rules", () => {
  const bins = [bin(2), bin(1), bin(3, { isCatchAll: true })];
  const fields: FieldMeta[] = [
    {
      field: "name",
      label: "Name",
      type: "string",
      path: "name",
      operators: [],
    },
  ];
  const set = preset(bins, {
    isRepackMode: true,
    autoAssignField: "name",
    repackSlots: [
      {
        id: "slot",
        targetCount: 1,
        rule: {
          id: "slot-rule",
          combinator: "and",
          conditions: [
            {
              id: "slot-name",
              field: "name",
              operator: "equals",
              value: "Bolt",
            },
          ],
        },
      },
    ],
  });
  const loaded = { ...deps, cardsInBin: () => [{ name: "Bolt" }] };
  const choice = chooseScanBin(
    { name: "Bolt" },
    set,
    bins,
    bins,
    fields,
    loaded,
  );
  assert.equal(choice.bin?.binNumber, 3);
  assert.equal(choice.autoAssign, null);
  assert.deepEqual(
    scanHoldReason({ name: "Bolt" }, set, bins, fields, choice.bin, loaded),
    { reason: "repack-complete", binNumbers: [1, 2] },
  );
});

test("unmapped bins fall through the final module's bottom paddle", () => {
  const routes = [
    { binNumber: 1, module: 1, direction: "left" as const },
    { binNumber: 10, module: 5, direction: "right" as const },
  ];
  assert.equal(routeForBin(1, routes), routes[0]);
  assert.deepEqual(routeForBin(11, routes), {
    binNumber: 11,
    module: 5,
    direction: "bottom",
  });
  assert.deepEqual(routeForBin(1, []), {
    binNumber: 1,
    module: 1,
    direction: "bottom",
  });
});
