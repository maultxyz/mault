import {
  CARD_PRESENCE_THRESHOLD,
  COLOR_BAR_HUE_RANGES,
  COLOR_BAR_MIN_BRIGHTNESS,
  COLOR_BAR_MIN_SATURATION,
  COLOR_BAR_MIN_SHARE,
  MIN_CORNER_DISTANCE_SQ,
  MIN_USABLE_QUAD_AREA,
  MTG_CARD_ASPECT_RATIO,
} from "./constants/vision-model.constant";
import { DEFAULT_SCAN_REGION } from "./constants/scanner.constant";
import type { ColorBarRegion } from "./interfaces/ocr-region.interface";
import type {
  CardContour,
  CornerDetection,
  Point,
  ScanRegion,
} from "./interfaces/scanner.interface";
import type {
  CornerModelOutputs,
  RgbaImage,
} from "./interfaces/vision-model.interface";

export function orderCorners(points: Point[]): Point[] {
  const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  const sorted = [...points].sort(
    (a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx),
  );

  let start = 0;
  let bestScore = Infinity;
  for (let i = 0; i < sorted.length; i++) {
    const score = sorted[i].x + sorted[i].y;
    if (score < bestScore) {
      bestScore = score;
      start = i;
    }
  }
  const ordered = [0, 1, 2, 3].map((i) => sorted[(start + i) % 4]);

  const signedArea = ordered.reduce((sum, p, i) => {
    const next = ordered[(i + 1) % ordered.length];
    return sum + (p.x * next.y - next.x * p.y);
  }, 0);
  const canonical =
    signedArea < 0 ? [ordered[0], ordered[3], ordered[2], ordered[1]] : ordered;

  const edgeLengths = canonical.map((p, i) => {
    const next = canonical[(i + 1) % 4];
    return Math.hypot(next.x - p.x, next.y - p.y);
  });
  let shortestEdge = 0;
  for (let i = 1; i < edgeLengths.length; i++) {
    if (edgeLengths[i] < edgeLengths[shortestEdge]) shortestEdge = i;
  }
  return [0, 1, 2, 3].map((i) => canonical[(i + shortestEdge) % 4]);
}

export function quadArea(points: Point[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const next = points[(i + 1) % points.length];
    area += p.x * next.y - next.x * p.y;
  }
  return Math.abs(area) * 0.5;
}

export function isUsableQuad(points: Point[]): boolean {
  if (points.length !== 4) return false;

  const area = quadArea(points);
  if (!Number.isFinite(area) || area < MIN_USABLE_QUAD_AREA) return false;

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      if (dx * dx + dy * dy < MIN_CORNER_DISTANCE_SQ) return false;
    }
  }

  let pos = 0;
  let neg = 0;
  for (let i = 0; i < 4; i++) {
    const prev = points[(i + 3) % 4];
    const curr = points[i];
    const next = points[(i + 1) % 4];
    const cross =
      (curr.x - prev.x) * (next.y - curr.y) -
      (curr.y - prev.y) * (next.x - curr.x);
    if (cross > 0) pos++;
    if (cross < 0) neg++;
  }
  return !(pos > 0 && neg > 0);
}

export function parseCornerDetection(
  outputs: CornerModelOutputs,
  width: number,
  height: number,
  minSharpness: number,
): CornerDetection {
  const sharpness = outputs.sharpness ? outputs.sharpness[0] : null;
  const presence = outputs.presence
    ? 1 / (1 + Math.exp(-outputs.presence[0]))
    : 1;
  const confidence = sharpness ?? presence;
  const cardPresent =
    sharpness != null
      ? sharpness >= minSharpness
      : presence >= CARD_PRESENCE_THRESHOLD;

  if (!cardPresent) {
    return {
      cardPresent: false,
      confidence,
      sharpness,
      contour: null,
      rejectReason: "not_present",
    };
  }

  const pixelPoints: Point[] = [];
  for (let i = 0; i < 4; i++) {
    pixelPoints.push({
      x: Math.min(1, Math.max(0, outputs.corners[i * 2])) * width,
      y: Math.min(1, Math.max(0, outputs.corners[i * 2 + 1])) * height,
    });
  }

  const orderedPixel = orderCorners(pixelPoints);
  const orderedNormalized = orderedPixel.map((p) => ({
    x: p.x / width,
    y: p.y / height,
  }));

  if (!isUsableQuad(orderedNormalized)) {
    return {
      cardPresent: false,
      confidence,
      sharpness,
      contour: null,
      rejectReason: "unusable_quad",
    };
  }

  const [topLeft, topRight, bottomRight, bottomLeft] = orderedPixel;
  return {
    cardPresent: true,
    confidence,
    sharpness,
    contour: { topLeft, topRight, bottomRight, bottomLeft },
  };
}

function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[pivot][col])) pivot = row;
    }
    [M[col], M[pivot]] = [M[pivot], M[col]];

    const pivotVal = M[col][col];
    if (Math.abs(pivotVal) < 1e-12) {
      throw new Error("Degenerate quadrilateral - cannot solve homography");
    }
    for (let k = col; k <= n; k++) M[col][k] /= pivotVal;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = M[row][col];
      if (factor === 0) continue;
      for (let k = col; k <= n; k++) M[row][k] -= factor * M[col][k];
    }
  }

  return M.map((row) => row[n]);
}

export function contourToPoints(contour: CardContour): Point[] {
  return [
    contour.topLeft,
    contour.topRight,
    contour.bottomRight,
    contour.bottomLeft,
  ];
}

export function solveHomographyDstToSrc(srcCorners: Point[]): number[] {
  const dst: Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];

  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = dst[i];
    const { x: u, y: v } = srcCorners[i];
    A.push([x, y, 1, 0, 0, 0, -x * u, -y * u]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -x * v, -y * v]);
    b.push(v);
  }

  const h = solveLinearSystem(A, b);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

function channelOffsets(image: RgbaImage): [number, number, number] {
  return image.channelOrder === "bgra" ? [2, 1, 0] : [0, 1, 2];
}

export function warpRgba(
  source: RgbaImage,
  homography: number[],
  outputWidth: number,
  outputHeight: number,
): RgbaImage {
  const { width, height, data } = source;
  const [ro, go, bo] = channelOffsets(source);
  const out = new Uint8ClampedArray(outputWidth * outputHeight * 4);
  const h = homography;
  const maxX = width - 1;
  const maxY = height - 1;

  for (let dy = 0; dy < outputHeight; dy++) {
    const ny = dy / outputHeight;
    for (let dx = 0; dx < outputWidth; dx++) {
      const nx = dx / outputWidth;
      const w = h[6] * nx + h[7] * ny + h[8];
      const sx = (h[0] * nx + h[1] * ny + h[2]) / w;
      const sy = (h[3] * nx + h[4] * ny + h[5]) / w;

      const o = (dy * outputWidth + dx) * 4;
      out[o + 3] = 255;
      if (sx < 0 || sx > maxX || sy < 0 || sy > maxY) continue;

      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = Math.min(x0 + 1, maxX);
      const y1 = Math.min(y0 + 1, maxY);
      const fx = sx - x0;
      const fy = sy - y0;
      const i00 = (y0 * width + x0) * 4;
      const i10 = (y0 * width + x1) * 4;
      const i01 = (y1 * width + x0) * 4;
      const i11 = (y1 * width + x1) * 4;
      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;

      out[o] =
        data[i00 + ro] * w00 +
        data[i10 + ro] * w10 +
        data[i01 + ro] * w01 +
        data[i11 + ro] * w11;
      out[o + 1] =
        data[i00 + go] * w00 +
        data[i10 + go] * w10 +
        data[i01 + go] * w01 +
        data[i11 + go] * w11;
      out[o + 2] =
        data[i00 + bo] * w00 +
        data[i10 + bo] * w10 +
        data[i01 + bo] * w01 +
        data[i11 + bo] * w11;
    }
  }

  return { width: outputWidth, height: outputHeight, data: out };
}

export function dewarpRgba(
  source: RgbaImage,
  contour: CardContour,
  outputWidth: number,
  outputHeight = outputWidth,
): RgbaImage {
  return warpRgba(
    source,
    solveHomographyDstToSrc(contourToPoints(contour)),
    outputWidth,
    outputHeight,
  );
}

export function resizeRgba(
  source: RgbaImage,
  outputWidth: number,
  outputHeight: number,
): RgbaImage {
  const scaleX = source.width / outputWidth;
  const scaleY = source.height / outputHeight;
  return warpRgba(
    source,
    [source.width, 0, -0.5 + scaleX / 2, 0, source.height, -0.5 + scaleY / 2, 0, 0, 1],
    outputWidth,
    outputHeight,
  );
}

export function rotateRgba180(source: RgbaImage): RgbaImage {
  const { width, height, data } = source;
  const out = new Uint8ClampedArray(width * height * 4);
  const last = width * height - 1;
  for (let i = 0; i <= last; i++) {
    const s = i * 4;
    const d = (last - i) * 4;
    out[d] = data[s];
    out[d + 1] = data[s + 1];
    out[d + 2] = data[s + 2];
    out[d + 3] = data[s + 3];
  }
  return { width, height, data: out, channelOrder: source.channelOrder };
}

export function rgbaToChw(
  image: RgbaImage,
  mean: readonly number[],
  std: readonly number[],
): Float32Array {
  const { width, height, data } = image;
  const [ro, go, bo] = channelOffsets(image);
  const plane = width * height;
  const chw = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    const o = i * 4;
    chw[i] = (data[o + ro] / 255 - mean[0]) / std[0];
    chw[plane + i] = (data[o + go] / 255 - mean[1]) / std[1];
    chw[2 * plane + i] = (data[o + bo] / 255 - mean[2]) / std[2];
  }
  return chw;
}

export function l2Normalize(raw: ArrayLike<number>): number[] {
  let normSq = 0;
  for (let i = 0; i < raw.length; i++) normSq += raw[i] * raw[i];
  const norm = Math.sqrt(normSq);
  const denom = norm > 1e-8 ? norm : 1;
  const out = new Array<number>(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw[i] / denom;
  return out;
}

export function getDefaultCardContour(
  width: number,
  height: number,
  region: ScanRegion = DEFAULT_SCAN_REGION,
): CardContour {
  const cardAspect =
    width >= height ? 1 / MTG_CARD_ASPECT_RATIO : MTG_CARD_ASPECT_RATIO;
  let boxH = height * region.coverage;
  let boxW = boxH * cardAspect;
  if (boxW > width * region.coverage) {
    boxW = width * region.coverage;
    boxH = boxW / cardAspect;
  }
  const left = (width - boxW) / 2 + region.offsetX * width;
  const top = (height - boxH) / 2 + region.offsetY * height;

  return {
    topLeft: { x: left, y: top },
    topRight: { x: left + boxW, y: top },
    bottomRight: { x: left + boxW, y: top + boxH },
    bottomLeft: { x: left, y: top + boxH },
  };
}

function hueOf(r: number, g: number, b: number): number | null {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (max < COLOR_BAR_MIN_BRIGHTNESS || delta / max < COLOR_BAR_MIN_SATURATION)
    return null;
  let hue: number;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  return (hue * 60 + 360) % 360;
}

function colorForHue(hue: number): string | null {
  for (const [color, ranges] of Object.entries(COLOR_BAR_HUE_RANGES)) {
    if (ranges.some(([from, to]) => hue >= from && hue < to)) return color;
  }
  return null;
}

export function detectColorBarRgba(
  image: RgbaImage,
  region: ColorBarRegion,
): string | null {
  const [ro, go, bo] = channelOffsets(image);
  const left = Math.round(region.x * image.width);
  const top = Math.round(region.y * image.height);
  const width = Math.max(1, Math.round(region.width * image.width));
  const height = Math.max(1, Math.round(region.height * image.height));
  const votes: Record<string, number> = {};
  for (let y = top; y < Math.min(top + height, image.height); y++) {
    for (let x = left; x < Math.min(left + width, image.width); x++) {
      const o = (y * image.width + x) * 4;
      const hue = hueOf(image.data[o + ro], image.data[o + go], image.data[o + bo]);
      if (hue === null) continue;
      const color = colorForHue(hue);
      if (color) votes[color] = (votes[color] ?? 0) + 1;
    }
  }
  const [best] = Object.entries(votes).sort((a, b) => b[1] - a[1]);
  if (!best) return null;
  return best[1] / (width * height) >= COLOR_BAR_MIN_SHARE ? best[0] : null;
}
