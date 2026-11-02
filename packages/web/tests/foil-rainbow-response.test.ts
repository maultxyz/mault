import test from "node:test";
import assert from "node:assert/strict";
import { foilVerdict, measureFoilRainbow, measureFoilReflectance } from "../src/features/calibration/lib/foil-rainbow-response.ts";

const image = (width: number, height: number, pixel: (x: number, y: number) => [number, number, number]) => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x, y);
      data.set([r, g, b, 255], (y * width + x) * 4);
    }
  }
  return { width, height, data };
};

test("a single-colour highlight scores no rainbow, a multicolour one does", () => {
  const dark = image(40, 56, () => [20, 20, 20]);
  const haze = image(40, 56, (x, y) => (x > 10 && x < 30 && y > 10 && y < 46 ? [230, 200, 220] : [20, 20, 20]));
  const hues: [number, number, number][] = [[255, 40, 40], [40, 255, 40], [40, 40, 255]];
  const rainbow = image(40, 56, (x, y) => (x > 10 && x < 30 && y > 10 && y < 46 ? hues[x % 3] : [20, 20, 20]));
  assert.deepEqual(measureFoilRainbow(dark, haze), { rainbow: 0, localRainbow: 0 });
  assert.ok(measureFoilRainbow(dark, rainbow).localRainbow > 100);
  assert.deepEqual(measureFoilRainbow(dark, dark), { rainbow: 0, localRainbow: 0 });
  assert.throws(() => measureFoilRainbow(dark, image(41, 56, () => [0, 0, 0])), /Incompatible/);
});

test("smooth coloured glare can score high globally without providing local rainbow evidence", () => {
  const dark = image(120, 168, () => [20, 20, 20]);
  const glare = image(120, 168, (x) => [Math.round(70 + 170 * x / 119), 120, Math.round(240 - 170 * x / 119)]);
  const evidence = measureFoilRainbow(dark, glare);
  assert.ok(evidence.rainbow > 18);
  assert.ok(evidence.localRainbow < 18);
  assert.deepEqual(measureFoilRainbow(glare, dark), evidence);
});

test("local evidence is bounded by global evidence and does not leak between comparisons", () => {
  const dark = image(40, 56, () => [20, 20, 20]);
  const patches = image(40, 56, (x, y) => [x % 3 === 0 ? 240 : 40, y % 3 === 0 ? 240 : 40, 140]);
  const first = measureFoilRainbow(dark, patches);
  assert.ok(first.localRainbow >= 0 && first.localRainbow <= first.rainbow);
  assert.deepEqual(measureFoilRainbow(dark, dark), { rainbow: 0, localRainbow: 0 });
  assert.deepEqual(measureFoilRainbow(dark, patches), first);
  assert.throws(() => measureFoilRainbow({ width: 40, height: 56, data: new Uint8ClampedArray(10) }, dark), /Incompatible/);
});

test("reflectance ratios reject detailed printed colours under smooth illumination changes", () => {
  const printed = (x: number, y: number) => [0.06 + (x % 3) * 0.1, 0.06 + (y % 3) * 0.1, 0.12];
  const first = image(120, 168, (x, y) => printed(x, y).map((value) => Math.round(value ** (1 / 2.2) * 255)) as [number, number, number]);
  const second = image(120, 168, (x, y) => printed(x, y).map((value, channel) =>
    Math.round((value * (0.6 + x / 120 * 0.5) * [1.1, 0.9, 1.2][channel]) ** (1 / 2.2) * 255)) as [number, number, number]);
  const response = measureFoilReflectance(first, second);
  assert.ok(response.eligibleFraction > 0.99);
  assert.ok(response.changedFraction > 0.25);
  assert.ok(response.score < 1);
  assert.deepEqual(measureFoilReflectance(first, second), measureFoilReflectance(second, first));
  assert.equal(foilVerdict({
    first: response, repeat: response,
    led0Noise: measureFoilReflectance(first, first), farNoise: measureFoilReflectance(second, second),
  }, true), "nonFoil");
});

test("localized directional spectral changes survive normalization", () => {
  const base = image(120, 168, () => [70, 70, 70]);
  const spectral = image(120, 168, (x) => [x % 3 === 0 ? 230 : 70, x % 3 === 1 ? 230 : 70, x % 3 === 2 ? 230 : 70]);
  const response = measureFoilReflectance(base, spectral);
  assert.ok(response.score > 100);
  const noise = measureFoilReflectance(base, base);
  assert.equal(foilVerdict({ first: response, repeat: response, led0Noise: noise, farNoise: noise }, true), "foil");
  assert.deepEqual(measureFoilReflectance(spectral, base), response);
});

test("dark, clipped and unchanged captures cannot prove non-foil", () => {
  for (const level of [0, 20, 32, 90, 249, 250, 255]) {
    const same = image(40, 56, () => [level, level, level]);
    const response = measureFoilReflectance(same, same);
    assert.equal(response.score, 0);
    assert.equal(response.changedFraction, 0);
    assert.equal(response.eligibleFraction, level >= 32 && level < 250 ? 1 : 0);
    assert.equal(foilVerdict({ first: response, repeat: response, led0Noise: response, farNoise: response }, true), "uncertain");
  }
  const black = image(40, 56, () => [0, 0, 0]);
  const lit = image(40, 56, () => [160, 160, 160]);
  assert.equal(measureFoilReflectance(black, lit).eligibleFraction, 0);
  assert.throws(() => measureFoilReflectance(black, image(41, 56, () => [0, 0, 0])), /Incompatible/);
  assert.throws(() => measureFoilReflectance({ width: 40, height: 56, data: new Uint8ClampedArray(10) }, black), /Incompatible/);
});

test("neutral highlights and smooth coloured gradients are not local spectral evidence", () => {
  const base = image(120, 168, () => [70, 70, 70]);
  const neutral = image(120, 168, (x) => x % 4 ? [210, 210, 210] : [70, 70, 70]);
  const smooth = image(120, 168, (x) => [80 + x, 120, 220 - x]);
  assert.equal(measureFoilReflectance(base, neutral).score, 0);
  assert.ok(measureFoilReflectance(base, smooth).score < 1);
});

test("both pairs need matching evidence, usable lighting and low chromatic repeat noise", () => {
  const noise = { score: 0, eligibleFraction: 1, changedFraction: 0 };
  const strong = { score: 18, eligibleFraction: 0.25, changedFraction: 0.25 };
  const weak = { ...strong, score: 12 };
  const evidence = { first: strong, repeat: strong, led0Noise: noise, farNoise: noise };
  assert.equal(foilVerdict(evidence, true), "foil");
  assert.equal(foilVerdict(evidence, false), "uncertain");
  assert.equal(foilVerdict({ ...evidence, first: weak, repeat: weak }, true), "nonFoil");
  assert.equal(foilVerdict({ ...evidence, first: weak, repeat: weak }, false), "uncertain");
  assert.equal(foilVerdict({ ...evidence, first: weak }, true), "uncertain");
  assert.equal(foilVerdict({ ...evidence, first: { ...strong, score: 17.99 } }, true), "uncertain");
  assert.equal(foilVerdict({ ...evidence, first: { ...weak, score: 12.01 }, repeat: weak }, true), "uncertain");
  for (const key of ["first", "repeat", "led0Noise", "farNoise"] as const) {
    assert.equal(foilVerdict({ ...evidence, [key]: null }, true), "uncertain");
    assert.equal(foilVerdict({ ...evidence, [key]: { ...strong, eligibleFraction: 0.249 } }, true), "uncertain");
    for (const score of [NaN, Infinity, -1, 1001]) {
      assert.throws(() => foilVerdict({ ...evidence, [key]: { ...strong, score } }, true), /Invalid/);
    }
    for (const field of ["eligibleFraction", "changedFraction"] as const) {
      for (const value of [NaN, Infinity, -0.01, 1.01]) {
        assert.throws(() => foilVerdict({ ...evidence, [key]: { ...strong, [field]: value } }, true), /Invalid/);
      }
    }
  }
  for (const key of ["first", "repeat"] as const) {
    assert.equal(foilVerdict({ ...evidence, [key]: { ...strong, changedFraction: 0.249 } }, true), "uncertain");
  }
  for (const key of ["led0Noise", "farNoise"] as const) {
    assert.equal(foilVerdict({ ...evidence, [key]: { ...noise, score: 12 } }, true), "foil");
    assert.equal(foilVerdict({ ...evidence, [key]: { ...noise, score: 12.01 } }, true), "uncertain");
  }
});
