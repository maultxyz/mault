import assert from "node:assert/strict";
import { test } from "node:test";
import {
  pickConsensus,
  type PlayingCardWithDistance,
  pickBetterOrientation,
  resolveCardSearchMatches,
  preferDetectedColor,
  resolveScanBin,
  needsTextSearch,
  type BinConfig,
  type BinSet,
  type ScanRoutingContext,
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
function context(bins: BinConfig[], options: Partial<BinSet> = {}): ScanRoutingContext {
  return {
    binSet: preset(bins, options),
    configs: bins,
    fieldDefinitions: [],
    binContents: [],
    countCardsInBin: () => 0,
    isBinFull: () => false,
    binRoom: () => Infinity,
    createRuleId: () => "new-rule",
  };
}

test("orientation chooses a usable match before distance, retaining upright on a tie", () => {
  const upright = { data: [{ distance: 0.3 }], nearestDistance: 0.3 };
  const rotated = { data: [], nearestDistance: 0.1 };
  assert.equal(pickBetterOrientation({ result: upright }, { result: rotated }).result, upright);
  assert.equal(pickBetterOrientation({ result: upright }, { result: { ...upright } }).result, upright);
  assert.equal(needsTextSearch({ diagnostics: { reason: "ambiguous" } }), true);
});

test("shared color preference cannot expand the resolved close-match window", async () => {
  const result = {
    data: [
      { cardId: "blue", distance: 0.1, confidence: 90, card: { id: "blue", colorIdentity: ["U"] } },
      { cardId: "red-close", distance: 0.14, confidence: 86, card: { id: "red-close", colorIdentity: ["R"] } },
      { cardId: "red-far", distance: 0.17, confidence: 83, card: { id: "red-far", colorIdentity: ["R"] } },
    ],
  };
  const resolved = await resolveCardSearchMatches(result, async () => null);
  const preferred = preferDetectedColor(resolved, "R");
  assert.equal(preferred.card?.id, "red-close");
  assert.deepEqual(preferred.alternativeMatches.map((card) => card.id), ["blue"]);
  assert.equal(result.data[0].cardId, "blue");
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

test("matching retains upstream orientation, OCR and retry boundaries", () => {
  const empty = { data: [], nearestDistance: null };
  const matched = { data: [{ distance: 0.4 }], nearestDistance: 0.4 };
  assert.equal(pickBetterOrientation({ result: empty }, { result: matched }).result, matched);
  assert.equal(
    pickBetterOrientation({ result: matched }, { result: { ...matched, nearestDistance: 0.3 } }).result.nearestDistance,
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

});

test("Pi routing uses the shared pick-list decision before normal rules", () => {
  const bins = [bin(1), bin(2, { pickList: {
    mode: "until_found", entries: [{ name: "Bolt", quantity: 1, found: 0 }],
  }}), bin(3, { isCatchAll: true })];
  const decision = resolveScanBin({ name: "Bolt" }, context(bins));
  assert.equal(decision.action, "route");
  if (decision.action !== "route") return;
  assert.equal(decision.bin?.binNumber, 2);
  assert.equal(decision.pickListMatch?.entry.name, "Bolt");
  assert.equal(decision.autoAssignTarget, null);
});

test("Pi scan-only routing preserves the target and pauses for a full bin", () => {
  const bins = [bin(1), bin(2), bin(3, { isCatchAll: true })];
  const ctx = context(bins, { scanOnly: true, scanOnlyBin: 2 });
  assert.equal(resolveScanBin({ name: "Card" }, ctx).bin?.binNumber, 2);
  ctx.isBinFull = () => true;
  const decision = resolveScanBin({ name: "Card" }, ctx);
  assert.equal(decision.action, "pause");
  if (decision.action === "pause") assert.equal(decision.reason, "bin-full");
});

test("Pi chaos routing resumes into the emptied bin", () => {
  const bins = [bin(1), bin(2), bin(3, { isCatchAll: true })];
  const ctx = context(bins, { isChaosMode: true });
  ctx.isBinFull = () => true;
  const held = resolveScanBin({ name: "Card" }, ctx);
  assert.equal(held.action, "pause");
  if (held.action === "pause") assert.equal(held.reason, "all-chaos-bins-full");
  ctx.isBinFull = (number) => number !== 2;
  const resumed = resolveScanBin({ name: "Card" }, ctx);
  assert.equal(resumed.action, "route");
  assert.equal(resumed.bin?.binNumber, 2);
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
