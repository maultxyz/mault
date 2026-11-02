import assert from "node:assert/strict";
import test from "node:test";
import { measureFoilDirectionResponse } from "../src/features/calibration/lib/foil-direction-response.ts";

function artwork(light: (x: number, y: number) => number, glint?: { x: number; y: number }) {
  const width = 60;
  const height = 80;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const albedo = 0.3 + 0.6 * (((x * 7 + y * 13) % 17) / 16);
      let value = albedo * light(x, y);
      if (glint && Math.abs(x - glint.x) <= 1 && Math.abs(y - glint.y) <= 1) value = 250;
      const offset = (y * width + x) * 4;
      data[offset] = data[offset + 1] = data[offset + 2] = Math.min(255, value);
      data[offset + 3] = 255;
    }
  }
  return { width, height, data };
}

const fromLeft = (x: number) => 200 - x;
const fromRight = (x: number) => 140 + x;

test("printed artwork under a smooth left/right falloff shows almost no direction response", () => {
  const result = measureFoilDirectionResponse(artwork(fromLeft), artwork(fromRight))!;
  assert.ok(result.eligibleFraction > 0.99);
  assert.ok(result.residualP99 < 0.1);
  assert.equal(result.glintFraction, 0);
});

test("highlights that move with the light are counted on both sides", () => {
  const first = artwork(fromLeft, { x: 15, y: 30 });
  const second = artwork(fromRight, { x: 45, y: 50 });
  const result = measureFoilDirectionResponse(first, second)!;
  const flat = measureFoilDirectionResponse(artwork(fromLeft), artwork(fromRight))!;
  assert.ok(result.glintFraction > 0);
  assert.ok(result.residualP99 > flat.residualP99);
  const same = measureFoilDirectionResponse(first, first)!;
  assert.equal(same.residualP99, 0);
});

test("dark frames are unavailable and mismatched images are rejected", () => {
  assert.equal(measureFoilDirectionResponse(artwork(() => 5), artwork(() => 5)), null);
  assert.throws(() => measureFoilDirectionResponse(artwork(fromLeft), { width: 4, height: 4, data: new Uint8ClampedArray(64) }));
});
