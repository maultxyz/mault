import {
  MULTI_CARD_ASPECT_MAX,
  MULTI_CARD_ASPECT_MIN,
  MULTI_CARD_EDGE_MARGIN_RATIO,
  MULTI_CARD_MAX_CARDS,
  MULTI_CARD_MERGE_IOU,
  MULTI_CARD_MIN_AREA_RATIO,
  MULTI_CARD_REFINE_PADDING_RATIO,
  MULTI_CARD_WINDOW_SCALES,
  MULTI_CARD_WINDOW_STRIDE_RATIO,
} from "./constants/multi-card.constant";
import type { MultiCardCandidate, PixelBox } from "./interfaces/multi-card.interface";
import type { CardContour, Point } from "./interfaces/scanner.interface";
import { contourToPoints, quadArea } from "./vision";

function windowStarts(length: number, size: number, stride: number): number[] {
  if (size >= length) return [0];
  const starts: number[] = [];
  for (let start = 0; start + size < length; start += stride) starts.push(Math.round(start));
  starts.push(Math.round(length - size));
  return starts;
}

export function multiCardProposalWindows(width: number, height: number): PixelBox[] {
  const shortSide = Math.min(width, height);
  const windows: PixelBox[] = [];
  for (const scale of MULTI_CARD_WINDOW_SCALES) {
    const size = Math.round(shortSide * scale);
    const stride = Math.max(1, Math.round(size * MULTI_CARD_WINDOW_STRIDE_RATIO));
    for (const y of windowStarts(height, size, stride)) {
      for (const x of windowStarts(width, size, stride)) {
        windows.push({ x, y, width: Math.min(size, width), height: Math.min(size, height) });
      }
    }
  }
  return windows;
}

export function offsetContour(contour: CardContour, offset: Point): CardContour {
  const shift = (point: Point): Point => ({ x: point.x + offset.x, y: point.y + offset.y });
  return {
    topLeft: shift(contour.topLeft),
    topRight: shift(contour.topRight),
    bottomRight: shift(contour.bottomRight),
    bottomLeft: shift(contour.bottomLeft),
  };
}

export function contourBounds(contour: CardContour): PixelBox {
  const points = contourToPoints(contour);
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

export function cardQuadAspect(contour: CardContour): number {
  const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
  const horizontal =
    (distance(contour.topLeft, contour.topRight) + distance(contour.bottomLeft, contour.bottomRight)) / 2;
  const vertical =
    (distance(contour.topLeft, contour.bottomLeft) + distance(contour.topRight, contour.bottomRight)) / 2;
  const longSide = Math.max(horizontal, vertical);
  return longSide > 0 ? Math.min(horizontal, vertical) / longSide : 0;
}

export function isCompleteCardInWindow(contour: CardContour, windowWidth: number, windowHeight: number): boolean {
  const marginX = windowWidth * MULTI_CARD_EDGE_MARGIN_RATIO;
  const marginY = windowHeight * MULTI_CARD_EDGE_MARGIN_RATIO;
  const insideWindow = contourToPoints(contour).every(
    (point) =>
      point.x > marginX && point.x < windowWidth - marginX && point.y > marginY && point.y < windowHeight - marginY,
  );
  if (!insideWindow) return false;
  const aspect = cardQuadAspect(contour);
  if (aspect < MULTI_CARD_ASPECT_MIN || aspect > MULTI_CARD_ASPECT_MAX) return false;
  return quadArea(contourToPoints(contour)) >= windowWidth * windowHeight * MULTI_CARD_MIN_AREA_RATIO;
}

export function boxIntersectionOverUnion(a: PixelBox, b: PixelBox): number {
  const overlapWidth = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const overlapHeight = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  const overlap = overlapWidth * overlapHeight;
  const union = a.width * a.height + b.width * b.height - overlap;
  return union > 0 ? overlap / union : 0;
}

function boxContainsPoint(box: PixelBox, point: Point): boolean {
  return point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height;
}

function boxCenter(box: PixelBox): Point {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export function mergeCardCandidates(candidates: MultiCardCandidate[]): MultiCardCandidate[] {
  const ranked = [...candidates].sort((a, b) => b.confidence - a.confidence);
  const kept: { candidate: MultiCardCandidate; bounds: PixelBox }[] = [];
  for (const candidate of ranked) {
    const bounds = contourBounds(candidate.contour);
    const center = boxCenter(bounds);
    const duplicate = kept.some(
      (existing) =>
        boxIntersectionOverUnion(existing.bounds, bounds) > MULTI_CARD_MERGE_IOU ||
        boxContainsPoint(existing.bounds, center) ||
        boxContainsPoint(bounds, boxCenter(existing.bounds)),
    );
    if (!duplicate) kept.push({ candidate, bounds });
    if (kept.length >= MULTI_CARD_MAX_CARDS) break;
  }
  return sortCardsInReadingOrder(kept.map((entry) => entry.candidate));
}

export function sortCardsInReadingOrder(candidates: MultiCardCandidate[]): MultiCardCandidate[] {
  if (candidates.length === 0) return [];
  const withBounds = candidates.map((candidate) => ({ candidate, bounds: contourBounds(candidate.contour) }));
  const heights = withBounds.map((entry) => entry.bounds.height).sort((a, b) => a - b);
  const rowHeight = heights[Math.floor(heights.length / 2)] / 2;
  const byTop = [...withBounds].sort((a, b) => boxCenter(a.bounds).y - boxCenter(b.bounds).y);
  const rows: (typeof withBounds)[] = [];
  for (const entry of byTop) {
    const row = rows[rows.length - 1];
    if (row && boxCenter(entry.bounds).y - boxCenter(row[0].bounds).y <= rowHeight) row.push(entry);
    else rows.push([entry]);
  }
  return rows.flatMap((row) =>
    row.sort((a, b) => boxCenter(a.bounds).x - boxCenter(b.bounds).x).map((entry) => entry.candidate),
  );
}

export function multiCardRefineWindow(contour: CardContour, width: number, height: number): PixelBox {
  const bounds = contourBounds(contour);
  const padX = bounds.width * MULTI_CARD_REFINE_PADDING_RATIO;
  const padY = bounds.height * MULTI_CARD_REFINE_PADDING_RATIO;
  const x = Math.max(0, Math.floor(bounds.x - padX));
  const y = Math.max(0, Math.floor(bounds.y - padY));
  const right = Math.min(width, Math.ceil(bounds.x + bounds.width + padX));
  const bottom = Math.min(height, Math.ceil(bounds.y + bounds.height + padY));
  return { x, y, width: right - x, height: bottom - y };
}
