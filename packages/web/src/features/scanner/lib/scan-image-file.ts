import { detectCardCorners } from "@/features/scanner/lib/cornelius";
import { releaseCanvases } from "@/features/scanner/lib/scan-canvas";
import {
  scanPageBackgroundLuminance,
  scanPageLuminance,
  snapCardContourToScanPageEdges,
  snapCardContourWithEdgeSupport,
} from "@/features/scanner/lib/scan-page-card-edges";
import {
  SCAN_IMAGE_IMPORT_MAX_DIMENSION_PX,
  SCAN_IMAGE_IMPORT_PADDING_COLOR,
  SCAN_IMAGE_IMPORT_PADDING_RATIO,
  SCAN_PAGE_CARD_REGION_MARGIN_RATIO,
  SCAN_PAGE_OTHER_SIDE_MIN_EDGE_POINTS,
} from "@/lib/constants/scanner";
import type {
  ScanImageCanvas,
  ScanImageRegion,
  ScanPageMirrorAxis,
  ScanPageOtherSideCard,
} from "@/lib/interfaces/scanner";
import type { CardContour, Point } from "@magic-vault/shared";
import { scanLog } from "@/lib/scan-log";

function drawScanImageRegion(bitmap: ImageBitmap, region: ScanImageRegion): ScanImageCanvas {
  const scale = Math.min(
    1,
    SCAN_IMAGE_IMPORT_MAX_DIMENSION_PX / Math.max(region.width, region.height),
  );
  const imageWidth = Math.round(region.width * scale);
  const imageHeight = Math.round(region.height * scale);
  const padding = Math.round(
    Math.max(imageWidth, imageHeight) * SCAN_IMAGE_IMPORT_PADDING_RATIO,
  );

  const canvas = document.createElement("canvas");
  canvas.width = imageWidth + padding * 2;
  canvas.height = imageHeight + padding * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.fillStyle = SCAN_IMAGE_IMPORT_PADDING_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    bitmap,
    region.x,
    region.y,
    region.width,
    region.height,
    padding,
    padding,
    imageWidth,
    imageHeight,
  );

  const right = padding + imageWidth;
  const bottom = padding + imageHeight;
  return {
    canvas,
    imageContour: {
      topLeft: { x: padding, y: padding },
      topRight: { x: right, y: padding },
      bottomRight: { x: right, y: bottom },
      bottomLeft: { x: padding, y: bottom },
    },
  };
}

function wholeImageRegion(bitmap: ImageBitmap): ScanImageRegion {
  return { x: 0, y: 0, width: bitmap.width, height: bitmap.height };
}

export async function drawScanImageFile(file: File): Promise<ScanImageCanvas> {
  const bitmap = await createImageBitmap(file);
  try {
    return drawScanImageRegion(bitmap, wholeImageRegion(bitmap));
  } finally {
    bitmap.close();
  }
}

export function scanPageRegionAroundCard(
  cardContourOnDrawnPage: CardContour,
  drawnPageContour: CardContour,
  page: ScanImageRegion,
): ScanImageRegion {
  const drawnPixelsPerPagePixel =
    (drawnPageContour.topRight.x - drawnPageContour.topLeft.x) / page.width;
  const corners = [
    cardContourOnDrawnPage.topLeft,
    cardContourOnDrawnPage.topRight,
    cardContourOnDrawnPage.bottomRight,
    cardContourOnDrawnPage.bottomLeft,
  ].map((corner) => ({
    x: (corner.x - drawnPageContour.topLeft.x) / drawnPixelsPerPagePixel,
    y: (corner.y - drawnPageContour.topLeft.y) / drawnPixelsPerPagePixel,
  }));
  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);
  const cardLeft = Math.min(...xs);
  const cardTop = Math.min(...ys);
  const cardRight = Math.max(...xs);
  const cardBottom = Math.max(...ys);
  const margin =
    Math.max(cardRight - cardLeft, cardBottom - cardTop) * SCAN_PAGE_CARD_REGION_MARGIN_RATIO;
  const left = Math.max(0, Math.floor(cardLeft - margin));
  const top = Math.max(0, Math.floor(cardTop - margin));
  const right = Math.min(page.width, Math.ceil(cardRight + margin));
  const bottom = Math.min(page.height, Math.ceil(cardBottom + margin));
  if (right <= left || bottom <= top) return page;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function regionCorners(region: ScanImageRegion): CardContour {
  return {
    topLeft: { x: region.x, y: region.y },
    topRight: { x: region.x + region.width, y: region.y },
    bottomRight: { x: region.x + region.width, y: region.y + region.height },
    bottomLeft: { x: region.x, y: region.y + region.height },
  };
}

function mapContour(contour: CardContour, map: (point: Point) => Point): CardContour {
  return {
    topLeft: map(contour.topLeft),
    topRight: map(contour.topRight),
    bottomRight: map(contour.bottomRight),
    bottomLeft: map(contour.bottomLeft),
  };
}

function drawnPixelsPerPagePixel(region: ScanImageRegion, drawnRegion: ScanImageCanvas): number {
  return (drawnRegion.imageContour.topRight.x - drawnRegion.imageContour.topLeft.x) / region.width;
}

function contourOnDrawnRegion(
  contourOnPage: CardContour,
  region: ScanImageRegion,
  drawnRegion: ScanImageCanvas,
): CardContour {
  const scale = drawnPixelsPerPagePixel(region, drawnRegion);
  const origin = drawnRegion.imageContour.topLeft;
  return mapContour(contourOnPage, (point) => ({
    x: origin.x + (point.x - region.x) * scale,
    y: origin.y + (point.y - region.y) * scale,
  }));
}

function contourOnPage(
  contourOnDrawn: CardContour,
  region: ScanImageRegion,
  drawnRegion: ScanImageCanvas,
): CardContour {
  const scale = drawnPixelsPerPagePixel(region, drawnRegion);
  const origin = drawnRegion.imageContour.topLeft;
  return mapContour(contourOnDrawn, (point) => ({
    x: region.x + (point.x - origin.x) / scale,
    y: region.y + (point.y - origin.y) / scale,
  }));
}

export function mirrorCardToOtherSide(
  cardOnPage: CardContour,
  mirrorAxis: ScanPageMirrorAxis,
  page: ScanImageRegion,
): CardContour {
  if (mirrorAxis === "horizontal") {
    const mirror = (point: Point) => ({ x: page.width - point.x, y: point.y });
    return {
      topLeft: mirror(cardOnPage.topRight),
      topRight: mirror(cardOnPage.topLeft),
      bottomRight: mirror(cardOnPage.bottomLeft),
      bottomLeft: mirror(cardOnPage.bottomRight),
    };
  }
  const mirror = (point: Point) => ({ x: point.x, y: page.height - point.y });
  return {
    topLeft: mirror(cardOnPage.bottomLeft),
    topRight: mirror(cardOnPage.bottomRight),
    bottomRight: mirror(cardOnPage.topRight),
    bottomLeft: mirror(cardOnPage.topLeft),
  };
}

export function paddedCardCropOnPage(
  cardOnPage: CardContour,
  page: ScanImageRegion,
  marginPx: number,
): ScanImageRegion | null {
  const corners = [cardOnPage.topLeft, cardOnPage.topRight, cardOnPage.bottomRight, cardOnPage.bottomLeft];
  const left = Math.max(0, Math.floor(Math.min(...corners.map((corner) => corner.x)) - marginPx));
  const top = Math.max(0, Math.floor(Math.min(...corners.map((corner) => corner.y)) - marginPx));
  const right = Math.min(page.width, Math.ceil(Math.max(...corners.map((corner) => corner.x)) + marginPx));
  const bottom = Math.min(page.height, Math.ceil(Math.max(...corners.map((corner) => corner.y)) + marginPx));
  if (right <= left || bottom <= top) return null;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function otherSideCandidates(otherSideCard: ScanPageOtherSideCard, page: ScanImageRegion) {
  const { cardOnPage, mirrorAxis } = otherSideCard;
  const otherAxis: ScanPageMirrorAxis = mirrorAxis === "horizontal" ? "vertical" : "horizontal";
  const mirroredOnOtherAxis = mirrorCardToOtherSide(cardOnPage, otherAxis, page);
  return [
    {
      layout: "mirrored " + mirrorAxis,
      mirrorAxis,
      cardOnPage: mirrorCardToOtherSide(cardOnPage, mirrorAxis, page),
    },
    { layout: "same position", mirrorAxis, cardOnPage },
    { layout: "mirrored " + otherAxis, mirrorAxis: otherAxis, cardOnPage: mirroredOnOtherAxis },
    {
      layout: "turned 180",
      mirrorAxis: otherAxis,
      cardOnPage: mirrorCardToOtherSide(mirroredOnOtherAxis, mirrorAxis, page),
    },
  ];
}

function bestOtherSideCardOnPage(
  otherSideCard: ScanPageOtherSideCard,
  detectedOnPage: CardContour | null,
  drawnPage: ScanImageCanvas,
  page: ScanImageRegion,
): { cardOnPage: CardContour; mirrorAxis: ScanPageMirrorAxis } | null {
  const context = drawnPage.canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  const pixels = context.getImageData(0, 0, drawnPage.canvas.width, drawnPage.canvas.height);
  const luminanceAt = scanPageLuminance(pixels, drawnPage.imageContour);
  const backgroundLuminance = scanPageBackgroundLuminance(luminanceAt, drawnPage.imageContour);
  const candidates = [
    ...(detectedOnPage
      ? [{ layout: "detected", mirrorAxis: null, cardOnPage: detectedOnPage }]
      : []),
    ...otherSideCandidates(otherSideCard, page),
  ];
  const scored = candidates.map((candidate) => ({
    layout: candidate.layout,
    mirrorAxis: candidate.mirrorAxis,
    ...snapCardContourWithEdgeSupport(
      luminanceAt,
      contourOnDrawnRegion(candidate.cardOnPage, page, drawnPage),
      backgroundLuminance,
    ),
  }));
  const mostSupported = <Candidate extends { edgePointCount: number }>(list: Candidate[]) =>
    list.reduce((first, second) => (second.edgePointCount > first.edgePointCount ? second : first));
  const best = mostSupported(scored);
  const bestMirrored = mostSupported(scored.filter((candidate) => candidate.mirrorAxis !== null));
  const mirrorAxis = bestMirrored.mirrorAxis ?? otherSideCard.mirrorAxis;
  scanLog(
    `[document-scan] other side: using "${best.layout}", back flipped ${mirrorAxis}, edge points per layout`,
    Object.fromEntries(scored.map((candidate) => [candidate.layout, candidate.edgePointCount])),
  );
  return best.edgePointCount >= SCAN_PAGE_OTHER_SIDE_MIN_EDGE_POINTS
    ? { cardOnPage: contourOnPage(best.contour, page, drawnPage), mirrorAxis }
    : null;
}

export async function drawScanPageCardRegion(
  file: File,
  otherSideCard?: ScanPageOtherSideCard,
): Promise<ScanImageCanvas> {
  const bitmap = await createImageBitmap(file);
  try {
    const page = wholeImageRegion(bitmap);
    const drawnPage = drawScanImageRegion(bitmap, page);
    const detection = await detectCardCorners(drawnPage.canvas).catch(() => null);
    const detectedOnPage =
      detection?.cardPresent && detection.contour
        ? contourOnPage(detection.contour, page, drawnPage)
        : null;
    const otherSide = otherSideCard
      ? bestOtherSideCardOnPage(otherSideCard, detectedOnPage, drawnPage, page)
      : null;
    const roughCardOnPage = otherSideCard ? otherSide?.cardOnPage : detectedOnPage;
    if (!roughCardOnPage) return drawnPage;
    releaseCanvases([drawnPage.canvas]);
    const regionOnPage = scanPageRegionAroundCard(roughCardOnPage, regionCorners(page), page);
    const cardRegion = drawScanImageRegion(bitmap, regionOnPage);
    const roughCardOnRegion = contourOnDrawnRegion(roughCardOnPage, regionOnPage, cardRegion);
    const cardContour = otherSideCard
      ? snapContourInRegion(cardRegion, roughCardOnRegion)
      : await findCardContourInRegion(cardRegion);
    return {
      ...cardRegion,
      cardContour,
      cardContourOnPage: cardContour && contourOnPage(cardContour, regionOnPage, cardRegion),
      otherSideMirrorAxis: otherSide?.mirrorAxis,
    };
  } finally {
    bitmap.close();
  }
}

function snapContourInRegion(region: ScanImageCanvas, roughContour: CardContour): CardContour {
  const context = region.canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return roughContour;
  const pixels = context.getImageData(0, 0, region.canvas.width, region.canvas.height);
  const luminanceAt = scanPageLuminance(pixels, region.imageContour);
  const snappedContour = snapCardContourToScanPageEdges(
    luminanceAt,
    roughContour,
    scanPageBackgroundLuminance(luminanceAt, region.imageContour),
  );
  scanLog("[document-scan] snapped the card corners to the scanned edges", {
    rough: roughContour,
    snapped: snappedContour,
  });
  return snappedContour;
}

async function findCardContourInRegion(region: ScanImageCanvas): Promise<CardContour | undefined> {
  const detection = await detectCardCorners(region.canvas).catch(() => null);
  if (!detection?.cardPresent || !detection.contour) return undefined;
  return snapContourInRegion(region, detection.contour);
}

export function sortFilesByName(files: File[]): File[] {
  return [...files].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  );
}
