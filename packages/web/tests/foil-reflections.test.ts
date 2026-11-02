import assert from "node:assert/strict";
import test from "node:test";
import { measureFoilReflections } from "../src/features/calibration/lib/foil-reflections.ts";

function image(value = 51) {
  return { width: 160, height: 224, data: new Uint8ClampedArray(160 * 224 * 4).fill(value) };
}

function rectangle(target: ReturnType<typeof image>, left: number, top: number, width: number, height: number, value: number) {
  for (let y = top; y < top + height; y++) {
    for (let x = left; x < left + width; x++) {
      const index = (y * target.width + x) * 4;
      target.data[index] = target.data[index + 1] = target.data[index + 2] = value;
    }
  }
}

test("uniform illumination has no local reflection signal at any brightness", () => {
  for (const value of [0, 51, 180, 255]) {
    const metrics = measureFoilReflections(image(value));
    assert.ok(metrics.peakContrast < 1e-10);
    assert.equal(metrics.spotCount, 0);
    assert.equal(metrics.spotFraction, 0);
    assert.equal(metrics.largestSpotCompactness, 0);
  }
});

test("compact bright points produce distinct components with bounded shape measurements", () => {
  const target = image();
  rectangle(target, 40, 40, 5, 5, 255);
  rectangle(target, 90, 40, 5, 5, 255);
  const metrics = measureFoilReflections(target);
  assert.equal(metrics.spotCount, 2);
  assert.ok(metrics.peakContrast > 0.2);
  assert.ok(metrics.spotFraction > metrics.largestSpotFraction);
  assert.ok(metrics.largestSpotCompactness > 0 && metrics.largestSpotCompactness <= 1);
});

test("bright pixels outside the inset do not contribute", () => {
  const target = image();
  rectangle(target, 0, 0, 160, 4, 255);
  const metrics = measureFoilReflections(target);
  assert.equal(metrics.spotCount, 0);
  assert.ok(metrics.peakContrast < 1e-10);
});

test("broad uniform illumination has less candidate area than a row of point reflections", () => {
  const broad = image(180);
  const points = image(180);
  for (const x of [30, 55, 80, 105]) rectangle(points, x, 60, 5, 5, 255);
  assert.ok(measureFoilReflections(points).spotFraction > measureFoilReflections(broad).spotFraction);
});

test("invalid dimensions and incomplete buffers are rejected", () => {
  assert.throws(() => measureFoilReflections({ width: 10, height: 10, data: new Uint8ClampedArray(400) }));
  assert.throws(() => measureFoilReflections({ width: 160, height: 224, data: new Uint8ClampedArray(4) }));
});
