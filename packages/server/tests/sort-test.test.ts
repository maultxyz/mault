import assert from "node:assert/strict";
import { test } from "node:test";
import { explainSortTest, type BinConfig, type BinSet } from "@magic-vault/shared";

const bin = (binNumber: number, overrides: Partial<BinConfig> = {}): BinConfig => ({
  guid: `bin-${binNumber}`,
  binNumber,
  rules: { id: `rules-${binNumber}`, combinator: "and", conditions: [] },
  isCatchAll: false,
  isOverride: false,
  overridePriority: null,
  lowMatchPercent: null,
  maxCopies: null,
  maxCopiesBy: null,
  overflowBin: null,
  isDisabled: false,
  pickList: null,
  repackPriority: null,
  lastEmptiedAt: null,
  ...overrides,
});

const fieldDefinitions = [
  { field: "rarity", path: "rarity", label: "Rarity", type: "string" as const, operators: [] },
];
const rareRules = {
  id: "rare",
  combinator: "and" as const,
  conditions: [{ id: "c", field: "rarity", operator: "equals" as const, value: "rare" }],
};
const configs = [bin(1, { rules: rareRules }), bin(2, { isCatchAll: true })];
const binSet = { isActive: true } as BinSet;

test("a card matching a bin's rules goes there, with each condition checked", () => {
  const explanation = explainSortTest({
    card: { name: "Rare card", rarity: "rare" },
    binSet,
    configs,
    fieldDefinitions,
  });
  assert.equal(explanation.binNumber, 1);
  assert.equal(explanation.reason, "rules");
  assert.deepEqual(
    explanation.binChecks.map((check) => [check.binNumber, check.matched]),
    [[1, true]],
  );
  const condition = explanation.binChecks[0].check.items[0];
  assert.equal("cardValue" in condition && condition.cardValue, "rare");
});

test("a card no bin's rules match falls to the catch-all", () => {
  const explanation = explainSortTest({
    card: { name: "Common card", rarity: "common" },
    binSet,
    configs,
    fieldDefinitions,
  });
  assert.equal(explanation.binNumber, 2);
  assert.equal(explanation.reason, "noRuleMatched");
  assert.equal(explanation.binChecks[0].matched, false);
});
