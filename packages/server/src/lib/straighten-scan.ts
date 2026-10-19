import { InferenceSession, Tensor } from "onnxruntime-node";
import sharp from "sharp";
import { resolveCardDetectorModelPath } from "./models/model-registry";

const DETECTOR_SIZE = 384;
const OUTPUT_SIZE = 448;
const MIN_SHARPNESS = 0.02;
const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD = [0.229, 0.224, 0.225];

interface Point {
  x: number;
  y: number;
}

let sessionPromise: Promise<InferenceSession> | null = null;

function getSession(): Promise<InferenceSession> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const modelPath = await resolveCardDetectorModelPath();
      return InferenceSession.create(modelPath, {
        graphOptimizationLevel: "disabled",
      });
    })();
    sessionPromise.catch(() => {
      sessionPromise = null;
    });
  }
  return sessionPromise;
}

function orderCorners(points: Point[]): Point[] {
  const cx = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const cy = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const sorted = [...points].sort(
    (a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx),
  );
  let start = 0;
  let best = Infinity;
  for (let i = 0; i < sorted.length; i++) {
    const score = sorted[i].x + sorted[i].y;
    if (score < best) {
      best = score;
      start = i;
    }
  }
  const ordered = [0, 1, 2, 3].map((i) => sorted[(start + i) % 4]);
  const signed = ordered.reduce((sum, point, i) => {
    const next = ordered[(i + 1) % 4];
    return sum + (point.x * next.y - next.x * point.y);
  }, 0);
  const canonical =
    signed < 0 ? [ordered[0], ordered[3], ordered[2], ordered[1]] : ordered;
  const lengths = canonical.map((point, i) => {
    const next = canonical[(i + 1) % 4];
    return Math.hypot(next.x - point.x, next.y - point.y);
  });
  let shortest = 0;
  for (let i = 1; i < lengths.length; i++) {
    if (lengths[i] < lengths[shortest]) shortest = i;
  }
  return [0, 1, 2, 3].map((i) => canonical[(i + shortest) % 4]);
}

function usableQuad(points: Point[]): boolean {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const next = points[(i + 1) % points.length];
    area += point.x * next.y - next.x * point.y;
  }
  if (Math.abs(area) * 0.5 < 0.01) return false;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      if (dx * dx + dy * dy < 0.0004) return false;
    }
  }
  let positive = 0;
  let negative = 0;
  for (let i = 0; i < 4; i++) {
    const prev = points[(i + 3) % 4];
    const curr = points[i];
    const next = points[(i + 1) % 4];
    const cross =
      (curr.x - prev.x) * (next.y - curr.y) -
      (curr.y - prev.y) * (next.x - curr.x);
    if (cross > 0) positive++;
    if (cross < 0) negative++;
  }
  return !(positive > 0 && negative > 0);
}

function solveHomography(src: Point[]): number[] {
  const dst = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
  const rows: number[][] = [];
  const values: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = dst[i];
    const u = src[i].x;
    const v = src[i].y;
    rows.push([x, y, 1, 0, 0, 0, -x * u, -y * u]);
    values.push(u);
    rows.push([0, 0, 0, x, y, 1, -x * v, -y * v]);
    values.push(v);
  }
  const n = rows.length;
  const matrix = rows.map((row, i) => [...row, values[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(matrix[row][col]) > Math.abs(matrix[pivot][col])) pivot = row;
    }
    [matrix[col], matrix[pivot]] = [matrix[pivot], matrix[col]];
    const pivotVal = matrix[col][col];
    if (Math.abs(pivotVal) < 1e-12) {
      throw new Error("degenerate card corners");
    }
    for (let k = col; k <= n; k++) matrix[col][k] /= pivotVal;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = matrix[row][col];
      for (let k = col; k <= n; k++) matrix[row][k] -= factor * matrix[col][k];
    }
  }
  const h = matrix.map((row) => row[n]);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

async function detectCorners(
  rgb: Buffer,
  width: number,
  height: number,
): Promise<Point[] | null> {
  const resized = await sharp(rgb, {
    raw: { width, height, channels: 3 },
  })
    .resize(DETECTOR_SIZE, DETECTOR_SIZE, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer();
  const plane = DETECTOR_SIZE * DETECTOR_SIZE;
  const chw = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    const o = i * 3;
    chw[i] = (resized[o] / 255 - IMAGENET_MEAN[0]) / IMAGENET_STD[0];
    chw[plane + i] = (resized[o + 1] / 255 - IMAGENET_MEAN[1]) / IMAGENET_STD[1];
    chw[2 * plane + i] =
      (resized[o + 2] / 255 - IMAGENET_MEAN[2]) / IMAGENET_STD[2];
  }
  const session = await getSession();
  const outputs = await session.run({
    [session.inputNames[0]]: new Tensor("float32", chw, [
      1,
      3,
      DETECTOR_SIZE,
      DETECTOR_SIZE,
    ]),
  });
  const sharpness = outputs.sharpness?.data as Float32Array | undefined;
  if (sharpness && sharpness[0] < MIN_SHARPNESS) return null;
  const corners = outputs.corners.data as Float32Array;
  const points: Point[] = [];
  for (let i = 0; i < 4; i++) {
    points.push({
      x: Math.min(1, Math.max(0, corners[i * 2])) * width,
      y: Math.min(1, Math.max(0, corners[i * 2 + 1])) * height,
    });
  }
  const ordered = orderCorners(points);
  const normalized = ordered.map((point) => ({
    x: point.x / width,
    y: point.y / height,
  }));
  if (!usableQuad(normalized)) return null;
  return ordered;
}

function warp(
  rgb: Buffer,
  width: number,
  height: number,
  corners: Point[],
): Buffer {
  const h = solveHomography(corners);
  const out = Buffer.alloc(OUTPUT_SIZE * OUTPUT_SIZE * 3);
  const sample = (x: number, y: number) => {
    const x0 = Math.max(0, Math.min(width - 1, Math.floor(x)));
    const y0 = Math.max(0, Math.min(height - 1, Math.floor(y)));
    const x1 = Math.min(x0 + 1, width - 1);
    const y1 = Math.min(y0 + 1, height - 1);
    const fx = x - x0;
    const fy = y - y0;
    const at = (px: number, py: number, channel: number) =>
      rgb[(py * width + px) * 3 + channel];
    const pixel = [0, 0, 0];
    for (let channel = 0; channel < 3; channel++) {
      const top = at(x0, y0, channel) * (1 - fx) + at(x1, y0, channel) * fx;
      const bottom = at(x0, y1, channel) * (1 - fx) + at(x1, y1, channel) * fx;
      pixel[channel] = top * (1 - fy) + bottom * fy;
    }
    return pixel;
  };
  for (let dy = 0; dy < OUTPUT_SIZE; dy++) {
    const ny = dy / OUTPUT_SIZE;
    for (let dx = 0; dx < OUTPUT_SIZE; dx++) {
      const nx = dx / OUTPUT_SIZE;
      const w = h[6] * nx + h[7] * ny + h[8];
      const sx = (h[0] * nx + h[1] * ny + h[2]) / w;
      const sy = (h[3] * nx + h[4] * ny + h[5]) / w;
      const pixel = sample(sx, sy);
      const o = (dy * OUTPUT_SIZE + dx) * 3;
      out[o] = pixel[0];
      out[o + 1] = pixel[1];
      out[o + 2] = pixel[2];
    }
  }
  return out;
}

export async function straightenScan(buffer: Buffer): Promise<Buffer> {
  try {
    const { data, info } = await sharp(buffer)
      .rotate()
      .toColourspace("srgb")
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const corners = await detectCorners(data, info.width, info.height);
    if (!corners) return buffer;
    const warped = warp(data, info.width, info.height, corners);
    return sharp(warped, {
      raw: { width: OUTPUT_SIZE, height: OUTPUT_SIZE, channels: 3 },
    })
      .jpeg()
      .toBuffer();
  } catch (err) {
    console.error("[straighten-scan] keeping the original crop:", err);
    return buffer;
  }
}
