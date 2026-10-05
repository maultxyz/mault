import assert from "node:assert/strict";
import { test } from "node:test";
import {
  countCopiesInBin,
  evaluateCardBin,
  evaluateRepackBin,
  isBinFull,
  toRuleCard,
  type BinConfig,
  type BinRuleGroup,
  type FieldMeta,
  type RepackSlot,
  withScanRuleFields,
} from "@magic-vault/shared";

const fields: FieldMeta[] = [
  { field: "color", label: "Color", type: "set", path: "colors", operators: [] },
  { field: "price", label: "Price", type: "numeric", path: "prices.usd", operators: [] },
];

function bin(
  binNumber: number,
  conditions: BinRuleGroup["conditions"],
  options: Partial<BinConfig> = {},
): BinConfig {
  return {
    guid: `bin-${binNumber}`,
    binNumber,
    rules: { id: `rules-${binNumber}`, combinator: "and", conditions },
    ...options,
  };
}

const colors = ["W", "U", "B", "R", "G"].map((color, index) =>
  bin(index + 1, [{ id: color, field: "color", operator: "contains_any", value: [color] }]),
);
const priceBin = bin(6, [{ id: "price", field: "price", operator: "gte", value: 1 }], {
  isOverride: true,
});
const catchAll = bin(7, [], { isCatchAll: true });
const configs = [...colors, priceBin, catchAll];

test("$1+ cards override every WUBRG bin, including the exact threshold", () => {
  for (const color of ["W", "U", "B", "R", "G"]) {
    for (const price of ["1.00", "2.50"]) {
      assert.equal(evaluateCardBin({ raw: { colors: [color], prices: { usd: price } } }, configs, fields), priceBin);
    }
  }
});

test("cheap and missing-price cards retain their color assignment", () => {
  for (const price of ["0.99", null, undefined, "unknown"]) {
    assert.equal(evaluateCardBin({ colors: ["U"], prices: { usd: price } }, configs, fields), colors[1]);
  }
});

test("legacy and disabled overrides preserve first-match behavior", () => {
  const card = { colors: ["W", "U"], prices: { usd: 2 } };
  for (const isOverride of [undefined, false]) {
    assert.equal(evaluateCardBin(card, [...colors, { ...priceBin, isOverride }, catchAll], fields), colors[0]);
  }
});

test("multiple matching overrides use configuration order without mutating it", () => {
  const earlierOverride = { ...colors[1], isOverride: true };
  const ordered = Object.freeze([colors[0], earlierOverride, priceBin, catchAll]);
  assert.equal(evaluateCardBin({ colors: ["W", "U"], prices: { usd: 2 } }, ordered as unknown as BinConfig[], fields), earlierOverride);
});

test("catch-all stays a fallback even if flagged as an override", () => {
  const fallback = { ...catchAll, isOverride: true };
  assert.equal(evaluateCardBin({ colors: ["W"] }, [fallback, ...colors], fields), colors[0]);
  assert.equal(evaluateCardBin({ colors: [] }, [fallback, ...colors], fields), fallback);
  assert.equal(evaluateCardBin({}, [], fields), undefined);
  assert.equal(evaluateCardBin({}, colors, fields), undefined);
});

test("empty overrides do not capture unmatched cards", () => {
  assert.equal(evaluateCardBin({}, [bin(1, [], { isOverride: true }), catchAll], fields), catchAll);
});

test("nested override rules must match before taking priority", () => {
  const nested = bin(6, [{
    id: "nested", combinator: "or", conditions: [
      { id: "price", field: "price", operator: "gte", value: 1 },
      { id: "color", field: "color", operator: "contains_any", value: ["G"] },
    ],
  }], { isOverride: true });
  assert.equal(evaluateCardBin({ colors: ["W", "G"] }, [...colors, nested], fields), nested);
  assert.equal(evaluateCardBin({ colors: ["W"] }, [...colors, nested], fields), colors[0]);
});

test("a bin at its copy limit passes the card to the next matching bin, then the catch-all", () => {
  const card = { id: "bolt-m10", colors: ["W", "U"] };
  const limited = { ...colors[0], maxCopies: 2 };
  const configsWithLimit = [limited, ...colors.slice(1), catchAll];
  const contents = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ binNumber: 1, scannedAt: 10 + i, card }));
  const copiesIn = (count: number) => (b: BinConfig) => countCopiesInBin(contents(count), b, card.id);

  assert.equal(evaluateCardBin(card, configsWithLimit, fields, copiesIn(1)), limited);
  assert.equal(evaluateCardBin(card, configsWithLimit, fields, copiesIn(2)), colors[1]);
  assert.equal(evaluateCardBin({ ...card, colors: ["W"] }, configsWithLimit, fields, copiesIn(2)), catchAll);
});

test("copy limits count only the same printing since the bin was last emptied", () => {
  const limited = { ...colors[0], maxCopies: 1, lastEmptiedAt: 100 };
  const contents = [
    { binNumber: 1, scannedAt: 50, card: { id: "a" } },
    { binNumber: 1, scannedAt: 150, card: { id: "b" } },
  ];
  assert.equal(countCopiesInBin(contents, limited, "a"), 0);
  assert.equal(countCopiesInBin(contents, limited, "b"), 1);
  assert.equal(evaluateCardBin({ id: "a", colors: ["W"] }, [limited, catchAll], fields, (b) => countCopiesInBin(contents, b, "a")), limited);
  assert.equal(evaluateCardBin({ id: "b", colors: ["W"] }, [limited, catchAll], fields, (b) => countCopiesInBin(contents, b, "b")), catchAll);
});

test("a copy-limited override at its limit no longer takes priority", () => {
  const card = { id: "x", colors: ["U"], prices: { usd: 5 } };
  const limitedOverride = { ...priceBin, maxCopies: 1 };
  assert.equal(evaluateCardBin(card, [...colors, limitedOverride, catchAll], fields, () => 1), colors[1]);
  assert.equal(evaluateCardBin(card, [...colors, limitedOverride, catchAll], fields), limitedOverride);
});

test("a full override remains the destination so capacity checks can stop scanning", () => {
  const full = { ...priceBin, cardLimit: 1 };
  const matched = evaluateCardBin({ colors: ["W"], prices: { usd: 2 } }, [...colors, full, catchAll], fields);
  assert.equal(matched, full);
  assert.equal(isBinFull([{ binNumber: 6, scannedAt: 1 }], matched!), true);
});

const repackBins = [1, 2, 3].map((n) => bin(n, []));
const repackConfigs = [...repackBins, bin(4, [], { isCatchAll: true })];
const anySlot: RepackSlot = {
  id: "slot",
  rule: {
    id: "slot-rule",
    combinator: "and",
    conditions: [{ id: "any", field: "price", operator: "gte", value: 0 }],
  },
  targetCount: 10,
};
const siftRules: BinRuleGroup = {
  id: "sift",
  combinator: "and",
  conditions: [{ id: "value", field: "marketValueUsd", operator: "gte", value: 5 }],
};
const ruleFields = withScanRuleFields(fields, []);

function repack(card: object, rules: BinRuleGroup | null, isFoil = false) {
  return evaluateRepackBin(
    toRuleCard(card, { isFoil }),
    repackConfigs,
    ruleFields,
    { repackSlots: [anySlot], repackAllowDuplicates: true, repackSiftRules: rules },
    () => [],
  );
}

test("sift rules send matching cards to the first bin and keep it out of packs", () => {
  assert.equal(repack({ price: 5, prices: { usd: 5 } }, siftRules), repackBins[0]);
  assert.equal(repack({ price: 1, prices: { usd: 1 } }, siftRules), repackBins[1]);
  assert.equal(repack({ prices: { usd: 1 } }, siftRules), repackBins[1]);
});

test("sift market value uses the foil price for foil scans", () => {
  const card = { price: 1, priceFoil: 9, prices: { usd: 1 } };
  assert.equal(repack(card, siftRules, true), repackBins[0]);
  assert.equal(repack(card, siftRules, false), repackBins[1]);
});

test("without sift rules every bin builds packs", () => {
  assert.equal(repack({ price: 50, prices: { usd: 50 } }, null), repackBins[0]);
  assert.equal(
    repack({ price: 50, prices: { usd: 50 } }, { ...siftRules, conditions: [] }),
    repackBins[0],
  );
});

test("the sift bin skips disabled bins", () => {
  const configsWithDisabled = [
    { ...repackBins[0], isDisabled: true },
    ...repackBins.slice(1),
    repackConfigs[3],
  ];
  assert.equal(
    evaluateRepackBin(
      toRuleCard({ price: 9, prices: { usd: 9 } }, {}),
      configsWithDisabled,
      ruleFields,
      { repackSlots: [anySlot], repackAllowDuplicates: true, repackSiftRules: siftRules },
      () => [],
    ),
    configsWithDisabled[1],
  );
});
