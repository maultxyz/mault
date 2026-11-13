import assert from "node:assert/strict";
import { test } from "node:test";
import {
  prepareMatchedScanPlan,
  prepareUnmatchedScanPlan,
  scanCompletionPauseReason,
  type BinConfig,
  type BinSet,
  type PlayingCardWithDistance,
  type ScanPlanContext,
  type MatchedScanDiagnostics,
} from "@magic-vault/shared";

const card = {
  id: "card",
  name: "Lightning Bolt",
  foilTypes: ["foil"],
  distance: 0.05,
} as PlayingCardWithDistance;
const bin: BinConfig = {
  guid: "bin",
  binNumber: 1,
  isCatchAll: true,
  rules: { id: "rules", combinator: "and", conditions: [] },
};
const input = {
  scanId: "scan",
  scannedAt: 123,
  card,
  sessionFoilType: null,
  fallbackFoilTypes: ["foil"],
  deviceGuid: "device",
  isNudgeFoilDetectionEnabled: true,
};
function context(
  set: Partial<BinSet> = {},
  extra: Partial<ScanPlanContext> = {},
): ScanPlanContext {
  return {
    binSet: { scanOnly: true, scanOnlyBin: 1, ...set } as BinSet,
    configs: [bin],
    fieldDefinitions: [],
    binContents: [],
    countCardsInBin: () => 0,
    isBinFull: () => false,
    binRoom: () => 10,
    createRuleId: () => "new-rule",
    ...extra,
  };
}

test("matched plans keep scan metadata in the saved record and rule fields out of the catalog card", () => {
  const plan = prepareMatchedScanPlan(
    {
      ...input,
      condition: "LP",
      capturedImageUrl: "image",
      alternativeMatches: [],
    },
    context(),
  );
  assert.equal(plan.action, "route");
  assert.equal(plan.persistence.kind, "cards");
  assert.equal(plan.record.card, card);
  assert.equal(plan.record.condition, "LP");
  assert.equal(plan.record.capturedImageUrl, "image");
  assert.equal(plan.record.alternativeMatches, undefined);
  assert.equal(plan.record.binNumber, 1);
  assert.ok("$scan" in plan.ruleCard);
  assert.ok(!("$scan" in plan.record.card));
  assert.equal(plan.binContent?.unsaved, false);
});

test("sort-only plans select usage accounting and retain physical contents without a collection save", () => {
  const plan = prepareMatchedScanPlan(
    { ...input, alternativeMatches: [card], capturedImageUrl: "image" },
    context({ skipSaving: true }),
  );
  assert.equal(plan.persistence.kind, "cards/sorted");
  assert.deepEqual(plan.persistence.record, {
    scanId: "scan",
    scannedAt: 123,
    card,
    hasAlternatives: true,
    vectorizedOn: undefined,
    deviceGuid: "device",
  });
  assert.equal(plan.binContent?.unsaved, true);
  assert.ok(!("capturedImageUrl" in plan.persistence.record));
});

test("forced and detected finishes use the same rule and save decisions", () => {
  for (const extra of [
    { sessionFoilType: "foil" },
    {
      foilDetection: {
        method: "nudge" as const,
        isFoilDetected: true,
        foilScore: 0.8,
      },
    },
  ]) {
    const plan = prepareMatchedScanPlan({ ...input, ...extra }, context());
    assert.equal(plan.record.foilType, "foil");
    assert.equal(plan.record.isFoil, true);
    assert.equal(plan.binContent?.foilType, "foil");
  }
});

test("low-match catchalls carry the low-confidence flag and bypass pick lists", () => {
  const low = { ...bin, lowMatchPercent: 99 };
  const plan = prepareMatchedScanPlan(input, context({}, { configs: [low] }));
  assert.equal(plan.action, "route");
  assert.equal(plan.record.lowConfidenceMatch, true);
  assert.equal(plan.pickListUpdate, null);
});

test("pick-list plans expose one common progress update", () => {
  const picked = {
    ...bin,
    isCatchAll: false,
    pickList: {
      mode: "until_found" as const,
      entries: [{ name: card.name, quantity: 2, found: 0 }],
    },
  };
  const plan = prepareMatchedScanPlan(
    input,
    context({ scanOnly: false }, { configs: [picked] }),
  );
  assert.equal(plan.record.binNumber, 1);
  assert.equal(plan.persistence.kind, "cards");
  assert.deepEqual(plan.persistence.record.pickListUpdate, {
    binGuid: "bin",
    name: card.name,
    delta: 1,
  });
  assert.deepEqual(plan.pickListUpdate, {
    binGuid: "bin",
    binNumber: 1,
    name: card.name,
    delta: 1,
  });
});

test("unmatched sort-only scans route without saving and still reserve physical capacity", () => {
  const unmatched = {
    scanId: "miss",
    scannedAt: 456,
    capturedImageUrl: "image",
    embedding: [1, 2],
  };
  const saved = prepareUnmatchedScanPlan(unmatched, context());
  assert.equal(saved.persistence.kind, "unmatched");
  assert.deepEqual(saved.record.embedding, [1, 2]);
  const unsaved = prepareUnmatchedScanPlan(
    unmatched,
    context({ skipSaving: true }),
  );
  assert.equal(unsaved.persistence.kind, "none");
  assert.equal(unsaved.binContent?.binNumber, 1);
  assert.equal(unsaved.binContent?.capacityOnly, true);
  assert.equal(unsaved.binContent?.unsaved, true);
  const full = prepareUnmatchedScanPlan(
    unmatched,
    context({ skipSaving: true }, { isBinFull: () => true }),
  );
  assert.equal(full.action, "pause");
});

test("completion pauses only after the final repack slot is filled", () => {
  const pack = { ...bin, isCatchAll: false };
  const ctx = context(
    {
      scanOnly: false,
      isRepackMode: true,
      repackSlots: [
        {
          id: "slot",
          targetCount: 1,
          rule: {
            id: "slot-rule",
            combinator: "and",
            conditions: [
              {
                id: "name",
                field: "name",
                operator: "equals",
                value: card.name,
              },
            ],
          },
        },
      ],
    },
    {
      configs: [pack],
      fieldDefinitions: [
        {
          field: "name",
          path: "name",
          label: "Name",
          type: "string",
          operators: [],
        },
      ],
    },
  );
  const plan = prepareMatchedScanPlan(input, ctx);
  assert.equal(scanCompletionPauseReason(plan, ctx), null);
  assert.equal(
    scanCompletionPauseReason(plan, {
      ...ctx,
      binContents: [plan.binContent!],
    }),
    "all-packs-complete",
  );
});

test("cards from another game always use sort-only accounting", () => {
  const plan = prepareMatchedScanPlan(
    { ...input, card: { ...card, gameKey: "pokemon" }, gameKey: "mtg" },
    context(),
  );
  assert.equal(plan.persistence.kind, "cards/sorted");
  assert.equal(plan.binContent?.unsaved, true);
});

test("shared plans preserve detected stamps, printed foil and both document images", () => {
  const diagnostics: MatchedScanDiagnostics = {
    matchedBy: "embedding",
    vectorizedOn: "server",
    detection: {
      cardDetected: true,
      sharpness: null,
      confidence: 1,
      fallbackReason: null,
    },
    orientation: "upright",
    matchesNeeded: 1,
    attempts: [],
    candidates: [],
    ocr: null,
    stampDetection: { stamp: "1st Edition", score: 1, isStampDetected: true },
    printedFoilMarker: {
      marker: "star",
      glyphHeightRatio: 1,
      glyphWidthRatio: 1,
      starShapeScore: 1,
    },
  };
  const plan = prepareMatchedScanPlan(
    {
      ...input,
      diagnostics,
      capturedImageUrl: "front",
      capturedBackImageUrl: "back",
      isNudgeFoilDetectionEnabled: false,
      isFoilStarDetectionEnabled: true,
    },
    context(),
  );
  assert.equal(plan.record.stamp, "1st Edition");
  assert.equal(plan.binContent?.stamp, "1st Edition");
  assert.equal(plan.record.isFoil, true);
  assert.equal(plan.record.capturedBackImageUrl, "back");
  assert.equal(plan.record.capturedImageUrl, "front");
  const disabled = prepareMatchedScanPlan(
    {
      ...input,
      diagnostics,
      isNudgeFoilDetectionEnabled: false,
      isFoilStarDetectionEnabled: false,
    },
    context(),
  );
  assert.equal(disabled.record.isFoil, undefined);
  const unmatched = prepareUnmatchedScanPlan(
    { scanId: "miss", scannedAt: 5, capturedBackImageUrl: "back" },
    context(),
  );
  assert.equal(unmatched.record.capturedBackImageUrl, "back");
});
