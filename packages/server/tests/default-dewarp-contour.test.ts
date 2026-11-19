import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dewarpRgba,
  getDefaultCardContour,
  getDefaultCardDewarpContour,
  type RgbaImage,
} from "@magic-vault/shared";

const OUTPUT_SIZE = 8;

function frameWithRedLeftHalf(width: number, height: number): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width / 2; x++) {
      const offset = (y * width + x) * 4;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
    }
  }
  return { width, height, data };
}

function isRed(image: RgbaImage, x: number, y: number): boolean {
  const offset = (y * image.width + x) * 4;
  return image.data[offset] > 200 && image.data[offset + 1] < 50;
}

test("the fallback crop of a landscape frame is turned clockwise to portrait", () => {
  const frame = frameWithRedLeftHalf(400, 200);
  const dewarped = dewarpRgba(frame, getDefaultCardDewarpContour(400, 200), OUTPUT_SIZE);
  for (let x = 0; x < OUTPUT_SIZE; x++) {
    assert.equal(isRed(dewarped, x, 1), true);
    assert.equal(isRed(dewarped, x, OUTPUT_SIZE - 2), false);
  }
});

test("the fallback crop of a portrait frame keeps the box as is", () => {
  assert.deepEqual(getDefaultCardDewarpContour(200, 400), getDefaultCardContour(200, 400));
});
