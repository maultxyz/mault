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
  SCAN_PAGE_OTHER_SIDE_MIN_SUPPORTED_EDGES,
  SCAN_PAGE_OTHER_SIDE_SEARCH_MARGIN_RATIO,
} from "@/lib/constants/scanner";
import type {
  ScanImageCanvas,
  ScanImageRegion,
  ScanPageMirrorAxis,
  ScanPageOtherSideCard,
  StraightCardCrop,
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
  marginRatio: number = SCAN_PAGE_CARD_REGION_MARGIN_RATIO,
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
    Math.max(cardRight - cardLeft, cardBottom - cardTop) * marginRatio;
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

export function straightCardCropOnPage(cardOnPage: CardContour, marginPx: number): StraightCardCrop {
  const { topLeft, topRight, bottomRight, bottomLeft } = cardOnPage;
  const vector = (from: Point, to: Point) => ({ x: to.x - from.x, y: to.y - from.y });
  const length = (point: Point) => Math.hypot(point.x, point.y);
  const unit = (point: Point) => ({ x: point.x / length(point), y: point.y / length(point) });
  const quarterTurnBack = (point: Point) => ({ x: point.y, y: -point.x });
  const top = vector(topLeft, topRight);
  const bottom = vector(bottomLeft, bottomRight);
  const left = vector(topLeft, bottomLeft);
  const right = vector(topRight, bottomRight);
  const directions = [unit(top), unit(bottom), quarterTurnBack(unit(left)), quarterTurnBack(unit(right))];
  let angleRadians = Math.atan2(
    directions.reduce((sum, direction) => sum + direction.y, 0),
    directions.reduce((sum, direction) => sum + direction.x, 0),
  );
  let width = (length(top) + length(bottom)) / 2;
  let height = (length(left) + length(right)) / 2;
  while (angleRadians > Math.PI / 4) {
    angleRadians -= Math.PI / 2;
    [width, height] = [height, width];
  }
  while (angleRadians <= -Math.PI / 4) {
    angleRadians += Math.PI / 2;
    [width, height] = [height, width];
  }
  return {
    center: {
      x: (topLeft.x + topRight.x + bottomRight.x + bottomLeft.x) / 4,
      y: (topLeft.y + topRight.y + bottomRight.y + bottomLeft.y) / 4,
    },
    angleRadians,
    width: width + marginPx * 2,
    height: height + marginPx * 2,
  };
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

async function detectCardNear(
  bitmap: ImageBitmap,
  cardOnPage: CardContour,
  page: ScanImageRegion,
): Promise<CardContour | null> {
  const searchRegion = scanPageRegionAroundCard(
    cardOnPage,
    regionCorners(page),
    page,
    SCAN_PAGE_OTHER_SIDE_SEARCH_MARGIN_RATIO,
  );
  const drawnRegion = drawScanImageRegion(bitmap, searchRegion);
  try {
    const detection = await detectCardCorners(drawnRegion.canvas).catch(() => null);
    return detection?.cardPresent && detection.contour
      ? contourOnPage(detection.contour, searchRegion, drawnRegion)
      : null;
  } finally {
    releaseCanvases([drawnRegion.canvas]);
  }
}

async function bestOtherSideCardOnPage(
  bitmap: ImageBitmap,
  otherSideCard: ScanPageOtherSideCard,
  detectedOnPage: CardContour | null,
  drawnPage: ScanImageCanvas,
  page: ScanImageRegion,
): Promise<{ cardOnPage: CardContour; mirrorAxis: ScanPageMirrorAxis } | null> {
  const context = drawnPage.canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  const pixels = context.getImageData(0, 0, drawnPage.canvas.width, drawnPage.canvas.height);
  const luminanceAt = scanPageLuminance(pixels, drawnPage.imageContour);
  const backgroundLuminance = scanPageBackgroundLuminance(luminanceAt, drawnPage.imageContour);
  const layouts = otherSideCandidates(otherSideCard, page);
  const detectedNearLayouts = await Promise.all(
    layouts.map(async (layout) => {
      const cardOnPage = await detectCardNear(bitmap, layout.cardOnPage, page);
      return cardOnPage
        ? { layout: "detected near " + layout.layout, mirrorAxis: layout.mirrorAxis, cardOnPage }
        : null;
    }),
  );
  const candidates = [
    ...(detectedOnPage
      ? [{ layout: "detected", mirrorAxis: null, cardOnPage: detectedOnPage }]
      : []),
    ...detectedNearLayouts.filter((candidate) => candidate !== null),
    ...layouts,
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
  const isBetter = (
    candidate: { supportedEdgeCount: number; edgePointCount: number },
    current: { supportedEdgeCount: number; edgePointCount: number },
  ) =>
    candidate.supportedEdgeCount > current.supportedEdgeCount ||
    (candidate.supportedEdgeCount === current.supportedEdgeCount &&
      candidate.edgePointCount > current.edgePointCount);
  const mostSupported = <Candidate extends { supportedEdgeCount: number; edgePointCount: number }>(
    list: Candidate[],
  ) => list.reduce((current, candidate) => (isBetter(candidate, current) ? candidate : current));
  const best = mostSupported(scored);
  const bestMirrored = mostSupported(scored.filter((candidate) => candidate.mirrorAxis !== null));
  const mirrorAxis = bestMirrored.mirrorAxis ?? otherSideCard.mirrorAxis;
  scanLog(
    `[document-scan] other side: using "${best.layout}", back flipped ${mirrorAxis}, background ${Math.round(backgroundLuminance)}, supported edges / edge points per layout ` +
      JSON.stringify(
        Object.fromEntries(
          scored.map((candidate) => [
            candidate.layout,
            `${candidate.supportedEdgeCount} / ${candidate.edgePointCount}`,
          ]),
        ),
      ),
  );
  return best.supportedEdgeCount >= SCAN_PAGE_OTHER_SIDE_MIN_SUPPORTED_EDGES
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
      ? await bestOtherSideCardOnPage(bitmap, otherSideCard, detectedOnPage, drawnPage, page)
      : null;
    const roughCardOnPage = otherSideCard ? otherSide?.cardOnPage : detectedOnPage;
    scanLog(
      `[document-scan] ${otherSideCard ? "other side" : "card side"} page ${page.width} x ${page.height} px, ` +
        `whole-page detection ${detectedOnPage ? "found a card" : "found nothing"}` +
        (otherSideCard ? `, front card at ${JSON.stringify(otherSideCard.cardOnPage)}` : ""),
    );
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
  scanLog(
    "[document-scan] snapped the card corners to the scanned edges " +
      JSON.stringify({ rough: roughContour, snapped: snappedContour }),
  );
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
