import type { OcrRegion } from "@magic-vault/shared";
import {
  OCR_ANCHOR_HEIGHT_WEIGHT,
  OCR_ANCHOR_MIN_LINE_HEIGHT_RATIO,
  OCR_SEARCH_MARGIN_X,
  OCR_SEARCH_MARGIN_Y,
} from "./constants/ocr";
import type { OcrBox, OcrPageLine } from "./interfaces/ocr-calibration";

export function regionBox(region: OcrRegion): OcrBox {
  return {
    x0: region.x,
    y0: region.y,
    x1: region.x + region.width,
    y1: region.y + region.height,
  };
}

export function searchWindow(region: OcrRegion): OcrBox {
  const box = regionBox(region);
  return {
    x0: Math.max(0, box.x0 - OCR_SEARCH_MARGIN_X),
    y0: Math.max(0, box.y0 - OCR_SEARCH_MARGIN_Y),
    x1: Math.min(1, box.x1 + OCR_SEARCH_MARGIN_X),
    y1: Math.min(1, box.y1 + OCR_SEARCH_MARGIN_Y),
  };
}

function overlaps(a0: number, a1: number, b0: number, b1: number): boolean {
  return Math.min(a1, b1) > Math.max(a0, b0);
}

function lineScore(line: OcrBox, region: OcrBox): number {
  const regionHeight = region.y1 - region.y0;
  const lineHeight = line.y1 - line.y0;
  const centerOffset =
    Math.abs((line.y0 + line.y1) / 2 - (region.y0 + region.y1) / 2) /
    regionHeight;
  const sizeMismatch = Math.abs(Math.log(lineHeight / regionHeight));
  return centerOffset + OCR_ANCHOR_HEIGHT_WEIGHT * sizeMismatch;
}

function union(boxes: OcrBox[]): OcrBox {
  return {
    x0: Math.min(...boxes.map((box) => box.x0)),
    y0: Math.min(...boxes.map((box) => box.y0)),
    x1: Math.max(...boxes.map((box) => box.x1)),
    y1: Math.max(...boxes.map((box) => box.y1)),
  };
}

export function anchorRegion(
  region: OcrRegion,
  lines: OcrPageLine[],
): OcrBox | null {
  const expected = regionBox(region);
  const window = searchWindow(region);
  const minHeight =
    (expected.y1 - expected.y0) * OCR_ANCHOR_MIN_LINE_HEIGHT_RATIO;
  const candidates = lines
    .map((line) => line.box)
    .filter(
      (box) =>
        box.y1 - box.y0 >= minHeight &&
        overlaps(box.x0, box.x1, expected.x0, expected.x1) &&
        overlaps(box.y0, box.y1, window.y0, window.y1),
    );
  if (candidates.length === 0) return null;

  if (region.multiline) {
    const inside = candidates.filter((box) =>
      overlaps(box.y0, box.y1, expected.y0, expected.y1),
    );
    if (inside.length === 0) return null;
    const text = union(inside);
    return {
      x0: Math.min(expected.x0, text.x0),
      y0: text.y0,
      x1: Math.max(expected.x1, text.x1),
      y1: text.y1,
    };
  }

  const best = candidates.reduce((winner, box) =>
    lineScore(box, expected) < lineScore(winner, expected) ? box : winner,
  );
  const center = (best.y0 + best.y1) / 2;
  const halfHeight = Math.max(best.y1 - best.y0, expected.y1 - expected.y0) / 2;
  return {
    x0: Math.min(expected.x0, best.x0),
    y0: center - halfHeight,
    x1: Math.max(expected.x1, best.x1),
    y1: center + halfHeight,
  };
}
