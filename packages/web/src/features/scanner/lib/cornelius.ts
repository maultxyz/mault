import type { CardContour, Point } from "@magic-vault/shared";
import { FASTWEB_DETECTOR_MODEL } from "./model-fetch";
import { loadOnnxSession, ort, runOnnxSession } from "./onnx-runtime";

// CollectorVision-family corner detector - currently HanClinto/ccgdetector-
// fastweb-single (MIT-licensed, not the AGPL Cornelius model this module was
// originally built against), pulled from HuggingFace at runtime and cached in
// IndexedDB rather than committed to the repo - see model-fetch.ts. Same
// 384x384 RGB in / corners+presence+sharpness out contract as Cornelius, so
// nothing else in this file needed to change. See collector_vision/detectors/
// neural.py upstream (https://github.com/HanClinto/CollectorVision) and its
// reference web scanner's scanner.worker.mjs for the preprocessing/
// postprocessing this mirrors (not just the bare model I/O contract).
const INPUT_SIZE = 384;
const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD = [0.229, 0.224, 0.225];

// Blank frames score ~0.008-0.014 depending on the exact detector build,
// valid cards ~0.03-0.07 (upstream docstring, Cornelius numbers - not yet
// re-measured against real scans for fastweb-single specifically).
export const DEFAULT_MIN_SHARPNESS = 0.02;

export interface CornerDetection {
  cardPresent: boolean;
  confidence: number;
  sharpness: number | null;
  // Ordered TL, TR, BR, BL, in the *source canvas's* pixel coordinates.
  contour: CardContour | null;
}

function getSession() {
  // graphOptimizationLevel: "disabled" - the default optimizer hits a "two
  // nodes with same node name (/GatherSliceToSplitFusion/)" fusion-pass bug
  // against this specific graph on at least onnxruntime-node 1.21.0. Applied
  // defensively here too in case onnxruntime-web's optimizer shares the bug.
  return loadOnnxSession("detector", FASTWEB_DETECTOR_MODEL, {
    graphOptimizationLevel: "disabled",
  });
}

// The reference scanner runs the detector on the *entire* video frame,
// squashed to 384x384, every time - it deliberately does not pre-crop to any
// region of interest ("Use the full video frame — do not crop to a fixed
// aspect ratio", app.js). Cropping first changes the effective scale/context
// the model sees versus what it was tuned against, and compounds any
// calibration drift straight into the detected corners.
function toChwTensor(canvas: HTMLCanvasElement): Float32Array {
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = INPUT_SIZE;
  cropCanvas.height = INPUT_SIZE;
  const ctx = cropCanvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, INPUT_SIZE, INPUT_SIZE);

  const { data } = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
  const plane = INPUT_SIZE * INPUT_SIZE;
  const chw = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    const o = i * 4;
    chw[i] = (data[o] / 255 - IMAGENET_MEAN[0]) / IMAGENET_STD[0];
    chw[plane + i] = (data[o + 1] / 255 - IMAGENET_MEAN[1]) / IMAGENET_STD[1];
    chw[2 * plane + i] = (data[o + 2] / 255 - IMAGENET_MEAN[2]) / IMAGENET_STD[2];
  }
  return chw;
}

// Reorders 4 raw (unsorted) model-output points into a proper perimeter walk:
// sort by angle around their centroid first (guarantees a non-self-
// intersecting quad regardless of the order the model emitted them in), pick
// the top-left-most as the start, then correct winding direction via signed
// area. Matches the reference scanner's orderCorners exactly - the simpler
// independent-min/max-per-corner approach this replaced had no winding-order
// correction and could produce a bowtie (self-intersecting) quad for an
// unusually-rotated card.
function orderCorners(points: Point[]): Point[] {
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

  // Rotate so the shortest edge becomes the top - matches Cornelius's own
  // convention so a sideways/landscape card dewarps upright without a
  // separate rotation step.
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

function quadArea(points: Point[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const next = points[(i + 1) % points.length];
    area += p.x * next.y - next.x * p.y;
  }
  return Math.abs(area) * 0.5;
}

// Ported from the reference scanner's isUsableQuad (scanner.worker.mjs):
// operates on normalised [0,1] points, same thresholds. Rejects a quad that's
// too small, has two corners nearly coincident, or is non-convex/self-
// intersecting (a reflex vertex's cross product has the opposite sign to the
// other three - this is the main thing a degenerate detector output looks
// like). Without this, a bad quad still gets perspective-warped and embedded,
// silently producing a garbage embedding with no error or warning.
function isUsableQuad(points: Point[]): boolean {
  if (points.length !== 4) return false;

  const area = quadArea(points);
  if (!Number.isFinite(area) || area < 0.01) return false;

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      if (dx * dx + dy * dy < 0.0004) return false;
    }
  }

  let pos = 0;
  let neg = 0;
  for (let i = 0; i < 4; i++) {
    const prev = points[(i + 3) % 4];
    const curr = points[i];
    const next = points[(i + 1) % 4];
    const cross =
      (curr.x - prev.x) * (next.y - curr.y) - (curr.y - prev.y) * (next.x - curr.x);
    if (cross > 0) pos++;
    if (cross < 0) neg++;
  }
  return !(pos > 0 && neg > 0);
}

export async function detectCardCorners(
  canvas: HTMLCanvasElement,
  minSharpness: number = DEFAULT_MIN_SHARPNESS,
): Promise<CornerDetection> {
  const session = await getSession();
  const chw = toChwTensor(canvas);

  const tensor = new ort.Tensor("float32", chw, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  const outputs = await runOnnxSession("detector", session, {
    [session.inputNames[0]]: tensor,
  });

  const corners = outputs["corners"].data as Float32Array;
  const sharpnessOut = outputs["sharpness"]?.data as Float32Array | undefined;
  const presenceOut = outputs["presence"]?.data as Float32Array | undefined;

  const sharpness = sharpnessOut ? sharpnessOut[0] : null;
  const presence = presenceOut ? 1 / (1 + Math.exp(-presenceOut[0])) : 1;
  const cardPresent = sharpness != null ? sharpness >= minSharpness : presence >= 0.5;

  if (!cardPresent) {
    return { cardPresent: false, confidence: sharpness ?? presence, sharpness, contour: null };
  }

  // Stay in normalised [0,1] space for validation, matching the reference's
  // thresholds exactly - only scale to canvas pixels once the quad is known
  // to be usable.
  const normalizedPoints: Point[] = [];
  for (let i = 0; i < 4; i++) {
    normalizedPoints.push({
      x: Math.min(1, Math.max(0, corners[i * 2])),
      y: Math.min(1, Math.max(0, corners[i * 2 + 1])),
    });
  }

  if (!isUsableQuad(normalizedPoints)) {
    return { cardPresent: false, confidence: sharpness ?? presence, sharpness, contour: null };
  }

  const pixelPoints = normalizedPoints.map((p) => ({
    x: p.x * canvas.width,
    y: p.y * canvas.height,
  }));
  const [topLeft, topRight, bottomRight, bottomLeft] = orderCorners(pixelPoints);

  return {
    cardPresent: true,
    confidence: sharpness ?? presence,
    sharpness,
    contour: { topLeft, topRight, bottomRight, bottomLeft },
  };
}
