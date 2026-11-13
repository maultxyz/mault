import { describe, expect, it } from "vitest";
import type { CardContour, Point } from "@magic-vault/shared";
import {
  boxContourWithMargin,
  cardContourWithMargin,
  fitCardEdgesInScanPage,
  findCardBoxInScanPage,
  straightenedCardSize,
} from "./scan-page-card-crop";

const backgroundLuminance = 197;
const cardLuminance = 80;

function pageWithCard(card: { left: number; top: number; width: number; height: number }) {
  return (x: number, y: number) =>
    x >= card.left && x < card.left + card.width && y >= card.top && y < card.top + card.height
      ? cardLuminance
      : backgroundLuminance;
}

const tiltedCorners = [
  { x: 330, y: 20 },
  { x: 700, y: 60 },
  { x: 660, y: 420 },
  { x: 290, y: 380 },
];

function pageWithTiltedCard(x: number, y: number) {
  const pixelCenter = { x: x + 0.5, y: y + 0.5 };
  const inside = tiltedCorners.every((corner, index) => {
    const next = tiltedCorners[(index + 1) % tiltedCorners.length];
    return (
      (next.x - corner.x) * (pixelCenter.y - corner.y) - (next.y - corner.y) * (pixelCenter.x - corner.x) >= 0
    );
  });
  return inside ? cardLuminance : backgroundLuminance;
}

function expectNear(actual: Point, expected: Point, tolerance: number) {
  expect(Math.abs(actual.x - expected.x)).toBeLessThan(tolerance);
  expect(Math.abs(actual.y - expected.y)).toBeLessThan(tolerance);
}

function contourCorners(contour: CardContour): Point[] {
  return [contour.topLeft, contour.topRight, contour.bottomRight, contour.bottomLeft];
}

describe("findCardBoxInScanPage", () => {
  it("boxes the card edges exactly", () => {
    const box = findCardBoxInScanPage(pageWithCard({ left: 300, top: 0, width: 420, height: 300 }), 1000, 480);
    expect(box).toEqual({ left: 300, top: 0, width: 420, height: 300 });
  });

  it("keeps the corners of a tilted card inside the box", () => {
    const box = findCardBoxInScanPage(pageWithTiltedCard, 1000, 480);
    expect(box?.left).toBeLessThanOrEqual(291);
    expect(box?.top).toBeLessThanOrEqual(21);
    expect((box?.left ?? 0) + (box?.width ?? 0)).toBeGreaterThanOrEqual(699);
    expect((box?.top ?? 0) + (box?.height ?? 0)).toBeGreaterThanOrEqual(419);
  });

  it("ignores specks smaller than a card edge", () => {
    const box = findCardBoxInScanPage(
      (x, y) => (x === 5 && y === 5 ? cardLuminance : backgroundLuminance),
      1000,
      480,
    );
    expect(box).toBeNull();
  });
});

describe("fitCardEdgesInScanPage", () => {
  it("finds the corners of a tilted card from its edges", () => {
    const box = findCardBoxInScanPage(pageWithTiltedCard, 1000, 480);
    const edges = box ? fitCardEdgesInScanPage(pageWithTiltedCard, box) : null;
    expect(edges).not.toBeNull();
    const contour = cardContourWithMargin(edges!, 1, 0);
    contourCorners(contour).forEach((corner, index) => expectNear(corner, tiltedCorners[index], 1.5));
  });

  it("finds a card that touches the leading edge of the page", () => {
    const touchingTop = pageWithCard({ left: 300, top: 0, width: 420, height: 300 });
    const box = findCardBoxInScanPage(touchingTop, 1000, 480);
    const edges = box ? fitCardEdgesInScanPage(touchingTop, box) : null;
    const contour = cardContourWithMargin(edges!, 1, 6);
    expectNear(contour.topLeft, { x: 294, y: -6 }, 0.01);
    expectNear(contour.bottomRight, { x: 726, y: 306 }, 0.01);
  });
});

describe("cardContourWithMargin", () => {
  it("scales to the page and pushes every edge out by the margin", () => {
    const contour = cardContourWithMargin(
      {
        left: { slope: 0, intercept: 100 },
        right: { slope: 0, intercept: 300 },
        top: { slope: 0, intercept: 50 },
        bottom: { slope: 0, intercept: 330 },
      },
      2,
      6,
    );
    expect(contour).toEqual({
      topLeft: { x: 194, y: 94 },
      topRight: { x: 606, y: 94 },
      bottomRight: { x: 606, y: 666 },
      bottomLeft: { x: 194, y: 666 },
    });
  });
});

describe("boxContourWithMargin", () => {
  it("adds the same margin on every side, past the page edge when the card touches it", () => {
    const contour = boxContourWithMargin({ left: 300, top: 0, width: 420, height: 300 }, 1, 4);
    expect(contour.topLeft).toEqual({ x: 296, y: -4 });
    expect(contour.bottomRight).toEqual({ x: 724, y: 304 });
  });
});

describe("straightenedCardSize", () => {
  it("measures a tilted card along its own edges", () => {
    expect(
      straightenedCardSize({
        topLeft: { x: 100, y: 100 },
        topRight: { x: 400, y: 140 },
        bottomRight: { x: 344, y: 560 },
        bottomLeft: { x: 44, y: 520 },
      }),
    ).toEqual({ width: 303, height: 424 });
  });
});
