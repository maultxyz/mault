import assert from "node:assert/strict";
import { test } from "node:test";
import type { OcrRegion } from "@magic-vault/shared";
import { anchorRegion } from "../src/lib/ocr-anchor";
import type { OcrPageLine } from "../src/lib/interfaces/ocr-calibration";

function line(x0: number, y0: number, x1: number, y1: number): OcrPageLine {
  const box = { x0, y0, x1, y1 };
  return { words: [{ text: "word", box }], box };
}

const nameRegion: OcrRegion = {
  field: "name",
  x: 0.06,
  y: 0.05,
  width: 0.64,
  height: 0.05,
};

test("anchorRegion follows a name printed lower than the region", () => {
  const box = anchorRegion(nameRegion, [line(0.07, 0.08, 0.5, 0.125)]);
  assert.ok(box);
  assert.ok(Math.abs((box.y0 + box.y1) / 2 - 0.1025) < 1e-9);
  assert.equal(box.x0, 0.06);
  assert.equal(box.x1, 0.7);
});

test("anchorRegion prefers the line closest in position and size", () => {
  const box = anchorRegion(nameRegion, [
    line(0.07, 0.06, 0.6, 0.1),
    line(0.07, 0.12, 0.9, 0.135),
  ]);
  assert.ok(box);
  assert.ok(box.y0 < 0.07 && box.y1 > 0.09);
});

test("anchorRegion ignores tiny noise and lines outside the region's columns", () => {
  assert.equal(
    anchorRegion(nameRegion, [
      line(0.07, 0.07, 0.3, 0.072),
      line(0.8, 0.06, 0.95, 0.1),
    ]),
    null,
  );
});

test("anchorRegion grows a multiline region to every line it overlaps", () => {
  const region: OcrRegion = {
    field: "name",
    x: 0.05,
    y: 0.55,
    width: 0.8,
    height: 0.08,
    multiline: true,
  };
  const box = anchorRegion(region, [
    line(0.06, 0.57, 0.7, 0.6),
    line(0.06, 0.61, 0.5, 0.645),
    line(0.06, 0.7, 0.9, 0.72),
  ]);
  assert.ok(box);
  assert.equal(box.y0, 0.57);
  assert.equal(box.y1, 0.645);
  assert.ok(Math.abs(box.x1 - 0.85) < 1e-9);
});
