import assert from "node:assert/strict";
import { test } from "node:test";
import { toPageLines } from "../src/lib/ocr";

const textBox = (text: string, x0: number, x1: number, y0 = 0.05, y1 = 0.09, confidence = 0.95) => ({
  text,
  confidence,
  box: { x0, y0, x1, y1 },
});

test("detected boxes on the same row join one line with per-word boxes", () => {
  const [line] = toPageLines([textBox("Lotus", 0.3, 0.4), textBox("Black", 0.1, 0.25)]);
  assert.deepEqual(
    line.words.map((word) => word.text),
    ["Black", "Lotus"],
  );
  assert.deepEqual(line.box, { x0: 0.1, y0: 0.05, x1: 0.4, y1: 0.09 });
});

test("multi-word boxes split into words across the box width", () => {
  const [line] = toPageLines([textBox("004/325 S", 0, 0.9)]);
  assert.equal(line.words.length, 2);
  assert.equal(line.words[0].box.x0, 0);
  assert.ok(Math.abs(line.words[0].box.x1 - 0.7) < 1e-9);
});

test("far apart or low confidence boxes stay separate or drop", () => {
  const lines = toPageLines([
    textBox("Black Lotus", 0.05, 0.3),
    textBox("1", 0.85, 0.9),
    textBox("Artifact", 0.05, 0.25, 0.57, 0.6),
    textBox("noise", 0.5, 0.6, 0.57, 0.6, 0.2),
  ]);
  assert.deepEqual(
    lines.map((line) => line.words.map((word) => word.text).join(" ")),
    ["Black Lotus", "1", "Artifact"],
  );
});
