import { dewarpCard } from "@/features/scanner/lib/perspective-warp";
import { releaseCanvases } from "@/features/scanner/lib/scan-canvas";
import {
  SCAN_PAGE_CARD_ANALYSIS_MAX_DIMENSION_PX,
  SCAN_PAGE_CARD_CROP_MARGIN_PX,
  SCAN_PAGE_CARD_DARK_LUMINANCE,
  SCAN_PAGE_CARD_EDGE_MIN_DARK_PIXELS,
  SCAN_PAGE_CARD_EDGE_MIN_SAMPLES,
  SCAN_PAGE_CARD_EDGE_OUTLIER_PX,
  SCAN_PAGE_CARD_EDGE_SAMPLE_INSET_RATIO,
  SCAN_PAGE_CARD_IMAGE_QUALITY,
  SCAN_PAGE_CARD_MIN_DARK_LINE_RATIO,
} from "@/lib/constants/scanner";
import type {
  ScanPageCardBox,
  ScanPageCardEdges,
  ScanPageEdgeLine,
} from "@/lib/interfaces/scanner";
import type { CardContour, Point } from "@magic-vault/shared";

function darkSpan(darkCounts: Uint32Array, minimumDarkCount: number): [number, number] | null {
  const first = darkCounts.findIndex((count) => count >= minimumDarkCount);
  if (first < 0) return null;
  let last = first;
  for (let index = darkCounts.length - 1; index > first; index--) {
    if (darkCounts[index] >= minimumDarkCount) {
      last = index;
      break;
    }
  }
  return [first, last];
}

function widenSpanToCorners(darkCounts: Uint32Array, [first, last]: [number, number]): [number, number] {
  while (first > 0 && darkCounts[first - 1] >= SCAN_PAGE_CARD_EDGE_MIN_DARK_PIXELS) first--;
  while (last < darkCounts.length - 1 && darkCounts[last + 1] >= SCAN_PAGE_CARD_EDGE_MIN_DARK_PIXELS) last++;
  return [first, last];
}

export function findCardBoxInScanPage(
  luminanceAt: (x: number, y: number) => number,
  width: number,
  height: number,
): ScanPageCardBox | null {
  const darkPerColumn = new Uint32Array(width);
  const darkPerRow = new Uint32Array(height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (luminanceAt(x, y) < SCAN_PAGE_CARD_DARK_LUMINANCE) {
        darkPerColumn[x]++;
        darkPerRow[y]++;
      }
    }
  }
  const coreColumns = darkSpan(darkPerColumn, height * SCAN_PAGE_CARD_MIN_DARK_LINE_RATIO);
  const coreRows = darkSpan(darkPerRow, width * SCAN_PAGE_CARD_MIN_DARK_LINE_RATIO);
  if (!coreColumns || !coreRows) return null;
  const columns = widenSpanToCorners(darkPerColumn, coreColumns);
  const rows = widenSpanToCorners(darkPerRow, coreRows);
  return {
    left: columns[0],
    top: rows[0],
    width: columns[1] - columns[0] + 1,
    height: rows[1] - rows[0] + 1,
  };
}

function fitLine(points: Point[]): ScanPageEdgeLine | null {
  if (points.length < SCAN_PAGE_CARD_EDGE_MIN_SAMPLES) return null;
  let sumAlong = 0;
  let sumAcross = 0;
  let sumAlongSquared = 0;
  let sumAlongTimesAcross = 0;
  for (const { x: along, y: across } of points) {
    sumAlong += along;
    sumAcross += across;
    sumAlongSquared += along * along;
    sumAlongTimesAcross += along * across;
  }
  const denominator = points.length * sumAlongSquared - sumAlong * sumAlong;
  if (denominator === 0) return null;
  const slope = (points.length * sumAlongTimesAcross - sumAlong * sumAcross) / denominator;
  return { slope, intercept: (sumAcross - slope * sumAlong) / points.length };
}

function fitLineIgnoringOutliers(points: Point[]): ScanPageEdgeLine | null {
  const firstFit = fitLine(points);
  if (!firstFit) return null;
  return fitLine(
    points.filter(
      ({ x: along, y: across }) =>
        Math.abs(firstFit.slope * along + firstFit.intercept - across) <= SCAN_PAGE_CARD_EDGE_OUTLIER_PX,
    ),
  );
}

function sampledRange(start: number, length: number): number[] {
  const inset = Math.floor(length * SCAN_PAGE_CARD_EDGE_SAMPLE_INSET_RATIO);
  const values: number[] = [];
  for (let value = start + inset; value < start + length - inset; value++) values.push(value);
  return values;
}

export function fitCardEdgesInScanPage(
  luminanceAt: (x: number, y: number) => number,
  box: ScanPageCardBox,
): ScanPageCardEdges | null {
  const isDark = (x: number, y: number) => luminanceAt(x, y) < SCAN_PAGE_CARD_DARK_LUMINANCE;
  const right = box.left + box.width - 1;
  const bottom = box.top + box.height - 1;
  const leftPoints: Point[] = [];
  const rightPoints: Point[] = [];
  for (const y of sampledRange(box.top, box.height)) {
    let x = box.left;
    while (x <= right && !isDark(x, y)) x++;
    if (x > right) continue;
    leftPoints.push({ x: y + 0.5, y: x });
    x = right;
    while (!isDark(x, y)) x--;
    rightPoints.push({ x: y + 0.5, y: x + 1 });
  }
  const topPoints: Point[] = [];
  const bottomPoints: Point[] = [];
  for (const x of sampledRange(box.left, box.width)) {
    let y = box.top;
    while (y <= bottom && !isDark(x, y)) y++;
    if (y > bottom) continue;
    topPoints.push({ x: x + 0.5, y });
    y = bottom;
    while (!isDark(x, y)) y--;
    bottomPoints.push({ x: x + 0.5, y: y + 1 });
  }
  const leftLine = fitLineIgnoringOutliers(leftPoints);
  const rightLine = fitLineIgnoringOutliers(rightPoints);
  const topLine = fitLineIgnoringOutliers(topPoints);
  const bottomLine = fitLineIgnoringOutliers(bottomPoints);
  if (!leftLine || !rightLine || !topLine || !bottomLine) return null;
  return { left: leftLine, right: rightLine, top: topLine, bottom: bottomLine };
}

function scaledOutwardLine(line: ScanPageEdgeLine, scale: number, outwardPx: number): ScanPageEdgeLine {
  return {
    slope: line.slope,
    intercept: line.intercept * scale + outwardPx * Math.hypot(1, line.slope),
  };
}

function edgeIntersection(vertical: ScanPageEdgeLine, horizontal: ScanPageEdgeLine): Point {
  const x =
    (vertical.slope * horizontal.intercept + vertical.intercept) /
    (1 - vertical.slope * horizontal.slope);
  return { x, y: horizontal.slope * x + horizontal.intercept };
}

export function cardContourWithMargin(
  analysisEdges: ScanPageCardEdges,
  pagePixelsPerAnalysisPixel: number,
  marginPx: number,
): CardContour {
  const left = scaledOutwardLine(analysisEdges.left, pagePixelsPerAnalysisPixel, -marginPx);
  const right = scaledOutwardLine(analysisEdges.right, pagePixelsPerAnalysisPixel, marginPx);
  const top = scaledOutwardLine(analysisEdges.top, pagePixelsPerAnalysisPixel, -marginPx);
  const bottom = scaledOutwardLine(analysisEdges.bottom, pagePixelsPerAnalysisPixel, marginPx);
  return {
    topLeft: edgeIntersection(left, top),
    topRight: edgeIntersection(right, top),
    bottomRight: edgeIntersection(right, bottom),
    bottomLeft: edgeIntersection(left, bottom),
  };
}

export function boxContourWithMargin(
  analysisBox: ScanPageCardBox,
  pagePixelsPerAnalysisPixel: number,
  marginPx: number,
): CardContour {
  const left = analysisBox.left * pagePixelsPerAnalysisPixel - marginPx;
  const top = analysisBox.top * pagePixelsPerAnalysisPixel - marginPx;
  const right = (analysisBox.left + analysisBox.width) * pagePixelsPerAnalysisPixel + marginPx;
  const bottom = (analysisBox.top + analysisBox.height) * pagePixelsPerAnalysisPixel + marginPx;
  return {
    topLeft: { x: left, y: top },
    topRight: { x: right, y: top },
    bottomRight: { x: right, y: bottom },
    bottomLeft: { x: left, y: bottom },
  };
}

export function straightenedCardSize(contour: CardContour) {
  const distance = (from: Point, to: Point) => Math.hypot(to.x - from.x, to.y - from.y);
  const width =
    (distance(contour.topLeft, contour.topRight) + distance(contour.bottomLeft, contour.bottomRight)) / 2;
  const height =
    (distance(contour.topLeft, contour.bottomLeft) + distance(contour.topRight, contour.bottomRight)) / 2;
  return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
}

function scannerBackgroundColor(
  data: Uint8ClampedArray,
  pageWidth: number,
  cardBox: ScanPageCardBox,
): string {
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  const pageHeight = data.length / 4 / pageWidth;
  for (let y = 0; y < pageHeight; y++) {
    const rowOverlapsCard = y >= cardBox.top && y < cardBox.top + cardBox.height;
    for (let x = 0; x < pageWidth; x++) {
      if (rowOverlapsCard && x >= cardBox.left && x < cardBox.left + cardBox.width) continue;
      const offset = (y * pageWidth + x) * 4;
      red += data[offset];
      green += data[offset + 1];
      blue += data[offset + 2];
      count++;
    }
  }
  if (count === 0) return "rgb(255, 255, 255)";
  return `rgb(${Math.round(red / count)}, ${Math.round(green / count)}, ${Math.round(blue / count)})`;
}

function straightenCardOnPage(
  bitmap: ImageBitmap,
  contour: CardContour,
  backgroundColor: string,
  created: HTMLCanvasElement[],
): HTMLCanvasElement | null {
  const corners = [contour.topLeft, contour.topRight, contour.bottomRight, contour.bottomLeft];
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  const padLeft = Math.max(0, Math.ceil(-Math.min(...xs)) + 1);
  const padTop = Math.max(0, Math.ceil(-Math.min(...ys)) + 1);
  const padRight = Math.max(0, Math.ceil(Math.max(...xs) - bitmap.width) + 1);
  const padBottom = Math.max(0, Math.ceil(Math.max(...ys) - bitmap.height) + 1);
  const paddedPage = document.createElement("canvas");
  created.push(paddedPage);
  paddedPage.width = bitmap.width + padLeft + padRight;
  paddedPage.height = bitmap.height + padTop + padBottom;
  const context = paddedPage.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, paddedPage.width, paddedPage.height);
  context.drawImage(bitmap, padLeft, padTop);
  const shift = (point: Point) => ({ x: point.x + padLeft, y: point.y + padTop });
  const contourOnPaddedPage: CardContour = {
    topLeft: shift(contour.topLeft),
    topRight: shift(contour.topRight),
    bottomRight: shift(contour.bottomRight),
    bottomLeft: shift(contour.bottomLeft),
  };
  const size = straightenedCardSize(contourOnPaddedPage);
  const straightened = dewarpCard(paddedPage, contourOnPaddedPage, size.width, size.height);
  created.push(straightened);
  return straightened;
}

export async function cropScanPageToCard(page: File): Promise<File> {
  const bitmap = await createImageBitmap(page);
  const created: HTMLCanvasElement[] = [];
  try {
    const scale = Math.min(
      1,
      SCAN_PAGE_CARD_ANALYSIS_MAX_DIMENSION_PX / Math.max(bitmap.width, bitmap.height),
    );
    const analysisCanvas = document.createElement("canvas");
    created.push(analysisCanvas);
    analysisCanvas.width = Math.max(1, Math.round(bitmap.width * scale));
    analysisCanvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const analysisContext = analysisCanvas.getContext("2d", { willReadFrequently: true });
    if (!analysisContext) return page;
    analysisContext.drawImage(bitmap, 0, 0, analysisCanvas.width, analysisCanvas.height);
    const { data } = analysisContext.getImageData(0, 0, analysisCanvas.width, analysisCanvas.height);
    const luminanceAt = (x: number, y: number) => {
      const offset = (y * analysisCanvas.width + x) * 4;
      return 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
    };
    const analysisBox = findCardBoxInScanPage(luminanceAt, analysisCanvas.width, analysisCanvas.height);
    if (!analysisBox) return page;
    const analysisEdges = fitCardEdgesInScanPage(luminanceAt, analysisBox);
    const pagePixelsPerAnalysisPixel = bitmap.width / analysisCanvas.width;
    const contour = analysisEdges
      ? cardContourWithMargin(analysisEdges, pagePixelsPerAnalysisPixel, SCAN_PAGE_CARD_CROP_MARGIN_PX)
      : boxContourWithMargin(analysisBox, pagePixelsPerAnalysisPixel, SCAN_PAGE_CARD_CROP_MARGIN_PX);
    const straightened = straightenCardOnPage(
      bitmap,
      contour,
      scannerBackgroundColor(data, analysisCanvas.width, analysisBox),
      created,
    );
    if (!straightened) return page;
    const blob = await new Promise<Blob | null>((resolve) =>
      straightened.toBlob(resolve, "image/jpeg", SCAN_PAGE_CARD_IMAGE_QUALITY),
    );
    return blob ? new File([blob], page.name, { type: "image/jpeg" }) : page;
  } finally {
    bitmap.close();
    releaseCanvases(created);
  }
}
