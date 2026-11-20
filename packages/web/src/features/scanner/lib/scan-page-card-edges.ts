import {
  SCAN_PAGE_CARD_EDGES,
  SCAN_PAGE_CARD_EDGE_MAX_TURN_RADIANS,
  SCAN_PAGE_CARD_EDGE_MIN_BACKGROUND_DIFFERENCE,
  SCAN_PAGE_CARD_EDGE_MIN_GRADIENT,
  SCAN_PAGE_CARD_EDGE_MIN_POINTS_RATIO,
  SCAN_PAGE_CARD_EDGE_MIN_SEARCH_PX,
  SCAN_PAGE_CARD_EDGE_OUTLIER_PX,
  SCAN_PAGE_CARD_EDGE_SAMPLES,
  SCAN_PAGE_CARD_EDGE_SAMPLE_START_RATIO,
  SCAN_PAGE_CARD_EDGE_SEARCH_RATIO,
} from "@/lib/constants/scanner";
import type { ScanPageEdgeLine, ScanPagePixels } from "@/lib/interfaces/scanner";
import type { CardContour, Point } from "@magic-vault/shared";

export function scanPageLuminance(
  pixels: ScanPagePixels,
  imageArea: CardContour,
): (x: number, y: number) => number {
  const minX = imageArea.topLeft.x;
  const minY = imageArea.topLeft.y;
  const maxX = imageArea.bottomRight.x - 1;
  const maxY = imageArea.bottomRight.y - 1;
  const pixelLuminance = (x: number, y: number) => {
    const offset = (y * pixels.width + x) * 4;
    return (
      0.299 * pixels.data[offset] +
      0.587 * pixels.data[offset + 1] +
      0.114 * pixels.data[offset + 2]
    );
  };
  return (x, y) => {
    if (x < minX || y < minY || x > maxX || y > maxY) return Number.NaN;
    const left = Math.floor(x);
    const top = Math.floor(y);
    const right = Math.min(left + 1, maxX);
    const bottom = Math.min(top + 1, maxY);
    const alongX = x - left;
    const alongY = y - top;
    const upper =
      pixelLuminance(left, top) * (1 - alongX) + pixelLuminance(right, top) * alongX;
    const lower =
      pixelLuminance(left, bottom) * (1 - alongX) + pixelLuminance(right, bottom) * alongX;
    return upper * (1 - alongY) + lower * alongY;
  };
}

export function scanPageBackgroundLuminance(
  luminanceAt: (x: number, y: number) => number,
  imageArea: CardContour,
): number {
  const left = imageArea.topLeft.x;
  const top = imageArea.topLeft.y;
  const right = imageArea.bottomRight.x - 1;
  const bottom = imageArea.bottomRight.y - 1;
  const ring: number[] = [];
  for (let x = left; x <= right; x++) ring.push(luminanceAt(x, top), luminanceAt(x, bottom));
  for (let y = top + 1; y < bottom; y++) ring.push(luminanceAt(left, y), luminanceAt(right, y));
  const sorted = ring.filter((value) => !Number.isNaN(value)).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : Number.NaN;
}

function outwardNormal(from: Point, to: Point, center: Point): Point {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const normal = { x: -(to.y - from.y) / length, y: (to.x - from.x) / length };
  const middle = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const pointsOutward =
    (middle.x - center.x) * normal.x + (middle.y - center.y) * normal.y >= 0;
  return pointsOutward ? normal : { x: -normal.x, y: -normal.y };
}

export function outermostEdgeOffset(
  luminanceAt: (x: number, y: number) => number,
  origin: Point,
  normal: Point,
  searchPx: number,
  backgroundLuminance: number,
): number | null {
  const offsets: number[] = [];
  const values: number[] = [];
  let reachesImageBorder = false;
  for (let offset = -searchPx; offset <= searchPx; offset++) {
    const value = luminanceAt(origin.x + normal.x * offset, origin.y + normal.y * offset);
    if (Number.isNaN(value)) {
      if (offset > 0) {
        reachesImageBorder = true;
        break;
      }
      offsets.length = 0;
      values.length = 0;
      continue;
    }
    offsets.push(offset);
    values.push(value);
  }
  const outermostValue = values.at(-1);
  if (
    reachesImageBorder &&
    outermostValue !== undefined &&
    Math.abs(outermostValue - backgroundLuminance) >= SCAN_PAGE_CARD_EDGE_MIN_BACKGROUND_DIFFERENCE
  ) {
    return offsets.at(-1)!;
  }
  const gradients = values.map((_, index) =>
    index === 0 || index === values.length - 1
      ? 0
      : Math.abs(values[index + 1] - values[index - 1]) / 2,
  );
  for (let index = gradients.length - 2; index > 0; index--) {
    const gradient = gradients[index];
    if (
      gradient >= SCAN_PAGE_CARD_EDGE_MIN_GRADIENT &&
      gradient >= gradients[index - 1] &&
      gradient >= gradients[index + 1]
    ) {
      return offsets[index];
    }
  }
  return null;
}

function fitLine(points: Point[]): ScanPageEdgeLine | null {
  if (points.length < 2) return null;
  const mean = {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
  let xx = 0;
  let xy = 0;
  let yy = 0;
  for (const point of points) {
    const dx = point.x - mean.x;
    const dy = point.y - mean.y;
    xx += dx * dx;
    xy += dx * dy;
    yy += dy * dy;
  }
  const angle = Math.atan2(2 * xy, xx - yy) / 2;
  return { point: mean, direction: { x: Math.cos(angle), y: Math.sin(angle) } };
}

function distanceFromLine(line: ScanPageEdgeLine, point: Point): number {
  return Math.abs(
    (point.x - line.point.x) * line.direction.y - (point.y - line.point.y) * line.direction.x,
  );
}

function fitLineIgnoringOutliers(
  points: Point[],
  minimumPoints: number,
): { line: ScanPageEdgeLine; inlierCount: number } | null {
  if (points.length < minimumPoints) return null;
  const firstFit = fitLine(points);
  if (!firstFit) return null;
  const inliers = points.filter(
    (point) => distanceFromLine(firstFit, point) <= SCAN_PAGE_CARD_EDGE_OUTLIER_PX,
  );
  const line = inliers.length >= minimumPoints ? fitLine(inliers) : null;
  return line ? { line, inlierCount: inliers.length } : null;
}

function intersect(first: ScanPageEdgeLine, second: ScanPageEdgeLine): Point | null {
  const cross = first.direction.x * second.direction.y - first.direction.y * second.direction.x;
  if (Math.abs(cross) < 1e-6) return null;
  const along =
    ((second.point.x - first.point.x) * second.direction.y -
      (second.point.y - first.point.y) * second.direction.x) /
    cross;
  return {
    x: first.point.x + first.direction.x * along,
    y: first.point.y + first.direction.y * along,
  };
}

function refineEdge(
  luminanceAt: (x: number, y: number) => number,
  from: Point,
  to: Point,
  center: Point,
  searchPx: number,
  backgroundLuminance: number,
): { line: ScanPageEdgeLine; edgePointCount: number } {
  const detectedLine = fitLine([from, to])!;
  const normal = outwardNormal(from, to, center);
  const edgePoints: Point[] = [];
  for (let sample = 0; sample < SCAN_PAGE_CARD_EDGE_SAMPLES; sample++) {
    const along =
      SCAN_PAGE_CARD_EDGE_SAMPLE_START_RATIO +
      ((1 - 2 * SCAN_PAGE_CARD_EDGE_SAMPLE_START_RATIO) * sample) /
        (SCAN_PAGE_CARD_EDGE_SAMPLES - 1);
    const origin = { x: from.x + (to.x - from.x) * along, y: from.y + (to.y - from.y) * along };
    const offset = outermostEdgeOffset(luminanceAt, origin, normal, searchPx, backgroundLuminance);
    if (offset !== null) {
      edgePoints.push({ x: origin.x + normal.x * offset, y: origin.y + normal.y * offset });
    }
  }
  const refinedFit = fitLineIgnoringOutliers(
    edgePoints,
    Math.ceil(SCAN_PAGE_CARD_EDGE_SAMPLES * SCAN_PAGE_CARD_EDGE_MIN_POINTS_RATIO),
  );
  if (!refinedFit) return { line: detectedLine, edgePointCount: 0 };
  const refinedLine = refinedFit.line;
  const turn = Math.abs(
    detectedLine.direction.x * refinedLine.direction.y -
      detectedLine.direction.y * refinedLine.direction.x,
  );
  const shift = distanceFromLine(refinedLine, {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2,
  });
  return turn <= Math.sin(SCAN_PAGE_CARD_EDGE_MAX_TURN_RADIANS) && shift <= searchPx
    ? { line: refinedLine, edgePointCount: refinedFit.inlierCount }
    : { line: detectedLine, edgePointCount: 0 };
}

export function snapCardContourToScanPageEdges(
  luminanceAt: (x: number, y: number) => number,
  detectedContour: CardContour,
  backgroundLuminance: number,
): CardContour {
  return snapCardContourWithEdgeSupport(luminanceAt, detectedContour, backgroundLuminance).contour;
}

export function snapCardContourWithEdgeSupport(
  luminanceAt: (x: number, y: number) => number,
  detectedContour: CardContour,
  backgroundLuminance: number,
): { contour: CardContour; edgePointCount: number; supportedEdgeCount: number } {
  const corners = SCAN_PAGE_CARD_EDGES.map(([from]) => detectedContour[from]);
  const center = {
    x: corners.reduce((sum, corner) => sum + corner.x, 0) / corners.length,
    y: corners.reduce((sum, corner) => sum + corner.y, 0) / corners.length,
  };
  const shortestEdge = Math.min(
    ...SCAN_PAGE_CARD_EDGES.map(([from, to]) =>
      Math.hypot(
        detectedContour[to].x - detectedContour[from].x,
        detectedContour[to].y - detectedContour[from].y,
      ),
    ),
  );
  const searchPx = Math.max(
    SCAN_PAGE_CARD_EDGE_MIN_SEARCH_PX,
    Math.round(shortestEdge * SCAN_PAGE_CARD_EDGE_SEARCH_RATIO),
  );
  const edges = SCAN_PAGE_CARD_EDGES.map(([from, to]) =>
    refineEdge(
      luminanceAt,
      detectedContour[from],
      detectedContour[to],
      center,
      searchPx,
      backgroundLuminance,
    ),
  );
  const [top, right, bottom, left] = edges.map((edge) => edge.line);
  const edgePointCount = edges.reduce((sum, edge) => sum + edge.edgePointCount, 0);
  const supportedEdgeCount = edges.filter((edge) => edge.edgePointCount > 0).length;
  const topLeft = intersect(left, top);
  const topRight = intersect(top, right);
  const bottomRight = intersect(right, bottom);
  const bottomLeft = intersect(bottom, left);
  if (!topLeft || !topRight || !bottomRight || !bottomLeft) {
    return { contour: detectedContour, edgePointCount: 0, supportedEdgeCount: 0 };
  }
  return {
    contour: { topLeft, topRight, bottomRight, bottomLeft },
    edgePointCount,
    supportedEdgeCount,
  };
}
