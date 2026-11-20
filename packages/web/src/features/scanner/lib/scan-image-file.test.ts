import { describe, expect, it } from "vitest";
import {
  mirrorCardToOtherSide,
  paddedCardCropOnPage,
  scanPageRegionAroundCard,
} from "./scan-image-file";

const drawnPage = {
  topLeft: { x: 100, y: 100 },
  topRight: { x: 1100, y: 100 },
  bottomRight: { x: 1100, y: 600 },
  bottomLeft: { x: 100, y: 600 },
};
const page = { x: 0, y: 0, width: 2000, height: 1000 };

describe("scanPageRegionAroundCard", () => {
  it("maps a skewed card back to page pixels with a margin on every side", () => {
    const region = scanPageRegionAroundCard(
      {
        topLeft: { x: 520, y: 210 },
        topRight: { x: 600, y: 200 },
        bottomRight: { x: 610, y: 310 },
        bottomLeft: { x: 530, y: 320 },
      },
      drawnPage,
      page,
    );
    expect(region).toEqual({ x: 792, y: 152, width: 276, height: 336 });
  });

  it("keeps the region inside the page when the card touches an edge", () => {
    const region = scanPageRegionAroundCard(
      {
        topLeft: { x: 100, y: 100 },
        topRight: { x: 180, y: 100 },
        bottomRight: { x: 180, y: 210 },
        bottomLeft: { x: 100, y: 210 },
      },
      drawnPage,
      page,
    );
    expect(region.x).toBe(0);
    expect(region.y).toBe(0);
    expect(region.width).toBeLessThanOrEqual(page.width);
  });
});

describe("mirrorCardToOtherSide", () => {
  const card = {
    topLeft: { x: 100, y: 50 },
    topRight: { x: 300, y: 60 },
    bottomRight: { x: 290, y: 330 },
    bottomLeft: { x: 90, y: 320 },
  };

  it("mirrors left to right for cards fed upright", () => {
    expect(mirrorCardToOtherSide(card, "horizontal", page)).toEqual({
      topLeft: { x: 1700, y: 60 },
      topRight: { x: 1900, y: 50 },
      bottomRight: { x: 1910, y: 320 },
      bottomLeft: { x: 1710, y: 330 },
    });
  });

  it("mirrors top to bottom for cards fed sideways and turned upright", () => {
    expect(mirrorCardToOtherSide(card, "vertical", page)).toEqual({
      topLeft: { x: 90, y: 680 },
      topRight: { x: 290, y: 670 },
      bottomRight: { x: 300, y: 940 },
      bottomLeft: { x: 100, y: 950 },
    });
  });
});

describe("paddedCardCropOnPage", () => {
  const tiltedCard = {
    topLeft: { x: 410, y: 120.4 },
    topRight: { x: 1150, y: 180 },
    bottomRight: { x: 1080, y: 1210 },
    bottomLeft: { x: 340.6, y: 1150 },
  };

  it("keeps the whole tilted card plus the margin on every side, without straightening it", () => {
    expect(paddedCardCropOnPage(tiltedCard, { x: 0, y: 0, width: 2000, height: 2000 }, 24)).toEqual({
      x: 316,
      y: 96,
      width: 858,
      height: 1138,
    });
  });

  it("stops at the page edges", () => {
    expect(paddedCardCropOnPage(tiltedCard, { x: 0, y: 0, width: 1160, height: 1220 }, 24)).toEqual({
      x: 316,
      y: 96,
      width: 844,
      height: 1124,
    });
  });
});
