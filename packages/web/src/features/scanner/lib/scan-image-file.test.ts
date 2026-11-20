import { describe, expect, it } from "vitest";
import {
  mirrorCardToOtherSide,
  scanPageRegionAroundCard,
  straightCardCropOnPage,
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

describe("straightCardCropOnPage", () => {
  const center = { x: 800, y: 600 };
  const tilt = (5 * Math.PI) / 180;
  const corner = (dx: number, dy: number) => ({
    x: center.x + dx * Math.cos(tilt) - dy * Math.sin(tilt),
    y: center.y + dx * Math.sin(tilt) + dy * Math.cos(tilt),
  });
  const tiltedCard = {
    topLeft: corner(-372, -519.5),
    topRight: corner(372, -519.5),
    bottomRight: corner(372, 519.5),
    bottomLeft: corner(-372, 519.5),
  };

  it("measures the tilted card and adds the margin on every side", () => {
    const crop = straightCardCropOnPage(tiltedCard, 24);
    expect(crop.center.x).toBeCloseTo(800);
    expect(crop.center.y).toBeCloseTo(600);
    expect(crop.angleRadians).toBeCloseTo(tilt);
    expect(crop.width).toBeCloseTo(744 + 48);
    expect(crop.height).toBeCloseTo(1039 + 48);
  });

  it("keeps the crop upright when the corners are named a quarter turn around", () => {
    const crop = straightCardCropOnPage(
      {
        topLeft: tiltedCard.bottomLeft,
        topRight: tiltedCard.topLeft,
        bottomRight: tiltedCard.topRight,
        bottomLeft: tiltedCard.bottomRight,
      },
      24,
    );
    expect(crop.angleRadians).toBeCloseTo(tilt);
    expect(crop.width).toBeCloseTo(744 + 48);
    expect(crop.height).toBeCloseTo(1039 + 48);
  });
});
