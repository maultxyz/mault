import assert from "node:assert/strict";
import test from "node:test";
import { measureFoilAmbientResponse } from "../src/features/calibration/lib/foil-ambient-response.ts";

function image() {
  const data = new Uint8ClampedArray(40 * 40 * 4);
  for (let i = 0; i < data.length; i += 4) {
    const value = 40 + (i / 4) % 80;
    data[i] = data[i + 1] = data[i + 2] = value;
    data[i + 3] = 255;
  }
  return { width: 40, height: 40, data };
}

test("identical images have zero residual and unit gains", () => {
  const source = image();
  const result = measureFoilAmbientResponse(source, source)!;
  assert.deepEqual(result.channelGains, [1, 1, 1]);
  assert.equal(result.positiveMean, 0);
  assert.equal(result.negativeMean, 0);
  assert.equal(result.eligibleFraction, 1);
});

test("global per-channel lighting gains are normalized rather than counted as reflections", () => {
  const ambient = image();
  const lit = image();
  for (let i = 0; i < lit.data.length; i += 4) {
    lit.data[i] *= 2;
    lit.data[i + 2] *= 2;
  }
  const result = measureFoilAmbientResponse(ambient, lit)!;
  assert.deepEqual(result.channelGains, [2, 1, 2]);
  assert.equal(result.positiveP99, 0);
  assert.equal(result.negativeMean, 0);
});

test("localized added reflection remains after ambient normalization", () => {
  const ambient = image();
  const lit = image();
  for (let y = 12; y < 18; y++) {
    for (let x = 12; x < 18; x++) lit.data[(y * 40 + x) * 4] += 70;
  }
  const result = measureFoilAmbientResponse(ambient, lit)!;
  assert.ok(result.positiveP99 > 0.25);
  assert.ok(result.positiveMean > 0);
  assert.equal(result.negativeMean, 0);
});

test("dark and saturated captures are unavailable, not zero-reflection successes", () => {
  for (const value of [0, 255]) {
    const source = image();
    source.data.fill(value);
    assert.equal(measureFoilAmbientResponse(source, source), null);
  }
});

test("localized darkening is recorded separately from positive response", () => {
  const ambient = image();
  const lit = image();
  for (let y = 12; y < 18; y++) {
    for (let x = 12; x < 18; x++) lit.data[(y * 40 + x) * 4] -= 20;
  }
  const result = measureFoilAmbientResponse(ambient, lit)!;
  assert.equal(result.positiveMean, 0);
  assert.ok(result.negativeMean > 0);
});

test("incompatible buffers fail explicitly", () => {
  assert.throws(() => measureFoilAmbientResponse(image(), { ...image(), width: 39 }));
  assert.throws(() => measureFoilAmbientResponse(image(), { ...image(), data: new Uint8ClampedArray(4) }));
});
