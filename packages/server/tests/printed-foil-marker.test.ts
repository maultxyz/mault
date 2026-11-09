import assert from "node:assert/strict";
import { test } from "node:test";
import {
  detectPrintedFoilMarkerRgba,
  OCR_CROP_HEIGHT,
  OCR_CROP_WIDTH,
  type RgbaImage,
} from "@magic-vault/shared";

const SET_LINE_TOP = 845;
const LINE_HEIGHT = 11;

function blankCard(): RgbaImage {
  const data = new Uint8ClampedArray(OCR_CROP_WIDTH * OCR_CROP_HEIGHT * 4);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  return { width: OCR_CROP_WIDTH, height: OCR_CROP_HEIGHT, data };
}

function paint(image: RgbaImage, x: number, y: number) {
  const offset = (y * image.width + x) * 4;
  image.data[offset] = 255;
  image.data[offset + 1] = 255;
  image.data[offset + 2] = 255;
}

function block(
  image: RgbaImage,
  left: number,
  top: number,
  width: number,
  height: number,
) {
  for (let y = top; y < top + height; y++) {
    for (let x = left; x < left + width; x++) paint(image, x, y);
  }
}

function star(image: RgbaImage, left: number, top: number, size: number) {
  const center = (size - 1) / 2;
  const points = Array.from({ length: 10 }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    const radius = index % 2 === 0 ? size / 2 : (size / 2) * 0.45;
    return [
      center + radius * Math.cos(angle),
      center + radius * Math.sin(angle),
    ];
  });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [xi, yi] = points[i];
        const [xj, yj] = points[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
          inside = !inside;
        }
      }
      if (inside) paint(image, left + x, top + y);
    }
  }
}

function collectorLine(marker: "star" | "dot"): RgbaImage {
  const image = blankCard();
  for (let letter = 0; letter < 6; letter++)
    block(image, 30 + letter * 10, 826, 8, 9);
  let x = 30;
  for (let letter = 0; letter < 3; letter++, x += 10) {
    block(image, x, SET_LINE_TOP, 8, LINE_HEIGHT);
  }
  x += 3;
  if (marker === "star") {
    star(image, x, SET_LINE_TOP, LINE_HEIGHT);
    x += LINE_HEIGHT + 4;
  } else {
    block(image, x, SET_LINE_TOP + 4, 4, 4);
    x += 8;
  }
  for (let letter = 0; letter < 2; letter++, x += 10) {
    block(image, x, SET_LINE_TOP, 8, LINE_HEIGHT);
  }
  block(image, x + 14, SET_LINE_TOP, 30, LINE_HEIGHT);
  return image;
}

test("the MTG collector line star is read as a foil marker", () => {
  assert.equal(
    detectPrintedFoilMarkerRgba(collectorLine("star"), "mtg").marker,
    "star",
  );
});

test("the MTG collector line dot is read as a non-foil marker", () => {
  assert.equal(
    detectPrintedFoilMarkerRgba(collectorLine("dot"), "mtg").marker,
    "dot",
  );
});

test("a card without a collector line reads no marker", () => {
  assert.equal(detectPrintedFoilMarkerRgba(blankCard(), "mtg").marker, null);
});

test("games without a foil marker band are never checked", () => {
  assert.equal(
    detectPrintedFoilMarkerRgba(collectorLine("star"), "pokemon").marker,
    null,
  );
});
