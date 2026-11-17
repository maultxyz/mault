import assert from "node:assert/strict";
import test from "node:test";
import { alignFoilContour, compareFoilWhites, foilCardPixels, foilCornerShift, foilQualityWarnings, foilReferenceIndex, measureFoilCard, resolveFoilContour } from "../src/features/calibration/lib/foil-card-metrics.ts";
import type { CardContour } from "../../shared/src/interfaces/scanner.interface.ts";

const contour: CardContour = {
  topLeft: { x: 10, y: 10 }, topRight: { x: 90, y: 10 },
  bottomLeft: { x: 10, y: 90 }, bottomRight: { x: 90, y: 90 },
};

test("corner alignment corrects detector orientation flips without hiding real movement", () => {
  const flipped = { topLeft: contour.bottomRight, topRight: contour.bottomLeft,
    bottomRight: contour.topLeft, bottomLeft: contour.topRight };
  assert.deepEqual(alignFoilContour(flipped, contour), contour);
  const moved = { ...contour, topLeft: { x: 15, y: 10 } };
  assert.ok(foilCornerShift(contour, alignFoilContour(moved, contour), 100, 100) > 0.03);
});

test("inset card measurements exclude a bright outer edge", () => {
  const data = new Uint8ClampedArray(20 * 20 * 4).fill(255);
  for (let y = 1; y < 19; y++) {
    for (let x = 1; x < 19; x++) {
      const offset = (y * 20 + x) * 4;
      data[offset] = data[offset + 1] = data[offset + 2] = 51;
    }
  }
  const pixels = foilCardPixels({ width: 20, height: 20, data });
  assert.equal(pixels.length, 18 * 18);
  const metrics = measureFoilCard(pixels);
  assert.ok(Math.abs(metrics.meanBrightness - 0.2) < 1e-10);
  assert.equal(metrics.clippedFraction, 0);
  assert.equal(metrics.highlightFraction, 0);
});

test("one saturated channel counts as clipping and a localized highlight", () => {
  const values = Array(100).fill(0.2);
  values[0] = 1;
  const metrics = measureFoilCard(values);
  assert.equal(metrics.clippedFraction, 0.01);
  assert.equal(metrics.highlightFraction, 0.01);
});

test("exposure drift is measured separately from normalized structural change", () => {
  const first = [0.2, 0.4, 0.6, 0.8];
  const repeat = first.map((value) => value / 2);
  const comparison = compareFoilWhites(first, repeat, contour, contour, 100, 100);
  assert.equal(comparison.meanShift, -0.25);
  assert.equal(comparison.normalizedMae, 0);
  assert.equal(comparison.cornerShiftFraction, 0);
  assert.deepEqual(foilQualityWarnings([], comparison), ["exposure"]);
});

test("movement, clipping, unavailable detection and structural changes warn explicitly", () => {
  const frame = { step: "white", contour, cardImage: null,
    metrics: { meanBrightness: 0.3, clippedFraction: 0.03, highlightFraction: 0.1 } };
  const warnings = foilQualityWarnings([frame, { ...frame, metrics: null }], {
    meanShift: 0, normalizedMae: 0.05, cornerShiftFraction: 0.02,
  });
  assert.deepEqual(warnings, ["missingCard", "clipping", "movement", "unstable"]);
  assert.deepEqual(foilQualityWarnings([frame], null), ["missingCard", "clipping"]);
});

test("quality limits warn above, not at, documented boundaries", () => {
  const frame = { step: "white", contour, cardImage: null,
    metrics: { meanBrightness: 0.3, clippedFraction: 0.02, highlightFraction: 0.1 } };
  assert.deepEqual(foilQualityWarnings([frame], {
    meanShift: -0.05, normalizedMae: 0.04, cornerShiftFraction: 0.01,
  }), []);
});

test("invalid pixel arrays and incompatible captures fail explicitly", () => {
  assert.throws(() => measureFoilCard([]));
  assert.throws(() => measureFoilCard([NaN]));
  assert.throws(() => foilCardPixels({ width: 20, height: 20, data: new Uint8ClampedArray(4) }));
  assert.throws(() => compareFoilWhites([0.2], [0.2, 0.3], contour, contour, 100, 100));
});

test("lit frames set geometry so dark ambient outlines of the holder are not trusted", () => {
  assert.equal(foilReferenceIndex([
    { lit: false, detected: true }, { lit: true, detected: false }, { lit: true, detected: true },
  ]), 2);
  assert.equal(foilReferenceIndex([{ lit: false, detected: true }, { lit: true, detected: false }]), 0);
  assert.equal(foilReferenceIndex([{ lit: false, detected: false }]), -1);
  const holder = { topLeft: { x: 0, y: 0 }, topRight: { x: 99, y: 0 },
    bottomRight: { x: 99, y: 99 }, bottomLeft: { x: 0, y: 99 } };
  assert.deepEqual(resolveFoilContour(holder, contour, false, 100, 100), contour);
  assert.equal(resolveFoilContour(holder, contour, true, 100, 100), null);
  assert.equal(resolveFoilContour(null, contour, true, 100, 100), null);
  assert.deepEqual(resolveFoilContour(null, contour, false, 100, 100), contour);
  const flipped = { topLeft: contour.bottomRight, topRight: contour.bottomLeft,
    bottomRight: contour.topLeft, bottomLeft: contour.topRight };
  assert.deepEqual(resolveFoilContour(flipped, contour, true, 100, 100), contour);
  assert.deepEqual(resolveFoilContour(holder, null, false, 100, 100), holder);
});

test("optional repeated states warn separately without flagging older captures", () => {
  const stable = { meanShift: 0, normalizedMae: 0, cornerShiftFraction: 0 };
  assert.deepEqual(foilQualityWarnings([], stable), []);
  assert.deepEqual(foilQualityWarnings([], stable, { ambientComparison: stable, brightComparison: stable }), []);
  assert.deepEqual(foilQualityWarnings([], stable, { ambientComparison: null, brightComparison: null }),
    ["ambientUnstable", "brightUnstable"]);
  for (const drift of [
    { meanShift: -0.051 }, { normalizedMae: 0.041 }, { cornerShiftFraction: 0.011 },
  ]) {
    assert.deepEqual(foilQualityWarnings([], stable, { brightComparison: { ...stable, ...drift } }),
      ["brightUnstable"]);
    assert.deepEqual(foilQualityWarnings([], stable, { ambientComparison: { ...stable, ...drift } }),
      ["ambientUnstable"]);
  }
  const boundary = { meanShift: -0.05, normalizedMae: 0.04, cornerShiftFraction: 0.01 };
  assert.deepEqual(foilQualityWarnings([], stable, { ambientComparison: boundary, brightComparison: boundary }), []);
});

test("staged captures do not report a missing card for an unscheduled white repeat", () => {
  const frame = { step: "led0", contour, cardImage: null,
    metrics: { meanBrightness: 0.3, clippedFraction: 0, highlightFraction: 0.1 } };
  assert.deepEqual(foilQualityWarnings([frame], undefined), []);
  assert.deepEqual(foilQualityWarnings([frame], null), ["missingCard"]);
  assert.deepEqual(foilQualityWarnings([{ ...frame, metrics: null }], undefined), ["missingCard"]);
});
