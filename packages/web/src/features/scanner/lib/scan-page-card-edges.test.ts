import { describe, expect, it } from "vitest";
import type { CardContour, Point } from "@magic-vault/shared";
import {
  scanPageLuminance,
  snapCardContourToScanPageEdges,
} from "./scan-page-card-edges";

const PAGE_SIZE = 600;
const CARD_CENTER = { x: 300, y: 300 };
const CARD_HALF_WIDTH = 126;
const CARD_HALF_HEIGHT = 176;
const CARD_TILT_RADIANS = (9 * Math.PI) / 180;

function rotate(point: Point, radians: number, center: Point): Point {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * Math.cos(radians) - dy * Math.sin(radians),
    y: center.y + dx * Math.sin(radians) + dy * Math.cos(radians),
  };
}

function cardContour(halfWidth: number, halfHeight: number, radians: number, center: Point): CardContour {
  return {
    topLeft: rotate({ x: center.x - halfWidth, y: center.y - halfHeight }, radians, center),
    topRight: rotate({ x: center.x + halfWidth, y: center.y - halfHeight }, radians, center),
    bottomRight: rotate({ x: center.x + halfWidth, y: center.y + halfHeight }, radians, center),
    bottomLeft: rotate({ x: center.x - halfWidth, y: center.y + halfHeight }, radians, center),
  };
}

function drawScanPage(
  background: number,
  border: number,
  inside: number,
  borderPx: number,
  imageTop = 0,
) {
  const data = new Uint8ClampedArray(PAGE_SIZE * PAGE_SIZE * 4);
  for (let y = 0; y < PAGE_SIZE; y++) {
    for (let x = 0; x < PAGE_SIZE; x++) {
      const upright = rotate({ x: x + 0.5, y: y + 0.5 }, -CARD_TILT_RADIANS, CARD_CENTER);
      const across = Math.abs(upright.x - CARD_CENTER.x);
      const down = Math.abs(upright.y - CARD_CENTER.y);
      const isCard = across <= CARD_HALF_WIDTH && down <= CARD_HALF_HEIGHT;
      const isInsideBorder =
        across <= CARD_HALF_WIDTH - borderPx && down <= CARD_HALF_HEIGHT - borderPx;
      const value = isInsideBorder ? inside : isCard ? border : background;
      const offset = (y * PAGE_SIZE + x) * 4;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  const imageArea: CardContour = {
    topLeft: { x: 0, y: imageTop },
    topRight: { x: PAGE_SIZE, y: imageTop },
    bottomRight: { x: PAGE_SIZE, y: PAGE_SIZE },
    bottomLeft: { x: 0, y: PAGE_SIZE },
  };
  return scanPageLuminance({ data, width: PAGE_SIZE, height: PAGE_SIZE }, imageArea);
}

function largestCornerError(actual: CardContour, expected: CardContour): number {
  return Math.max(
    ...(["topLeft", "topRight", "bottomRight", "bottomLeft"] as const).map((corner) =>
      Math.hypot(actual[corner].x - expected[corner].x, actual[corner].y - expected[corner].y),
    ),
  );
}

const trueContour = cardContour(CARD_HALF_WIDTH, CARD_HALF_HEIGHT, CARD_TILT_RADIANS, CARD_CENTER);
const roughDetection = cardContour(
  CARD_HALF_WIDTH - 6,
  CARD_HALF_HEIGHT + 5,
  CARD_TILT_RADIANS - 0.03,
  { x: 303, y: 297 },
);

describe("snapCardContourToScanPageEdges", () => {
  it("snaps a rough, slightly turned detection to a dark-bordered card's outer edge", () => {
    const luminanceAt = drawScanPage(215, 20, 120, 16);
    expect(largestCornerError(roughDetection, trueContour)).toBeGreaterThan(8);
    const snapped = snapCardContourToScanPageEdges(luminanceAt, roughDetection, 215);
    expect(largestCornerError(snapped, trueContour)).toBeLessThan(1.5);
  });

  it("finds a white border on a light scanner background instead of the inner frame", () => {
    const luminanceAt = drawScanPage(215, 245, 40, 14);
    const snapped = snapCardContourToScanPageEdges(luminanceAt, roughDetection, 215);
    expect(largestCornerError(snapped, trueContour)).toBeLessThan(1.5);
  });

  it("keeps the detection when there is no edge near it", () => {
    const luminanceAt = drawScanPage(215, 215, 215, 0);
    const snapped = snapCardContourToScanPageEdges(luminanceAt, roughDetection, 215);
    expect(largestCornerError(snapped, roughDetection)).toBeLessThan(1e-6);
  });

  it("keeps a leading edge that starts at the top of the scan instead of snapping to the inner frame", () => {
    const upright = cardContour(CARD_HALF_WIDTH, CARD_HALF_HEIGHT, 0, CARD_CENTER);
    const scanStartsAt = upright.topLeft.y + 3;
    const luminanceAt = drawScanPageUpright(scanStartsAt);
    const detected = cardContour(CARD_HALF_WIDTH - 4, CARD_HALF_HEIGHT - 6, 0.01, { x: 301, y: 302 });
    const snapped = snapCardContourToScanPageEdges(luminanceAt, detected, 215);
    expect(Math.abs(snapped.topLeft.y - scanStartsAt)).toBeLessThan(1.5);
    expect(Math.abs(snapped.topRight.y - scanStartsAt)).toBeLessThan(1.5);
    expect(Math.abs(snapped.bottomLeft.y - upright.bottomLeft.y)).toBeLessThan(1.5);
  });
});

function drawScanPageUpright(imageTop: number) {
  const data = new Uint8ClampedArray(PAGE_SIZE * PAGE_SIZE * 4);
  for (let y = 0; y < PAGE_SIZE; y++) {
    for (let x = 0; x < PAGE_SIZE; x++) {
      const across = Math.abs(x + 0.5 - CARD_CENTER.x);
      const down = Math.abs(y + 0.5 - CARD_CENTER.y);
      const isCard = across <= CARD_HALF_WIDTH && down <= CARD_HALF_HEIGHT;
      const isInsideBorder = across <= CARD_HALF_WIDTH - 16 && down <= CARD_HALF_HEIGHT - 16;
      const value = isInsideBorder ? 120 : isCard ? 20 : 215;
      const offset = (y * PAGE_SIZE + x) * 4;
      data.fill(value, offset, offset + 3);
      data[offset + 3] = 255;
    }
  }
  return scanPageLuminance(
    { data, width: PAGE_SIZE, height: PAGE_SIZE },
    {
      topLeft: { x: 0, y: imageTop },
      topRight: { x: PAGE_SIZE, y: imageTop },
      bottomRight: { x: PAGE_SIZE, y: PAGE_SIZE },
      bottomLeft: { x: 0, y: PAGE_SIZE },
    },
  );
}
