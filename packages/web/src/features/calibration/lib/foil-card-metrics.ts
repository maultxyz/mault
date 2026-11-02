import { FOIL_ANALYSIS_INSET, FOIL_QUALITY_LIMITS } from "../../../lib/constants/foil-calibration.ts";
import type { FoilCardMetrics, FoilSampleAnalysis, FoilWhiteComparison } from "@/lib/interfaces/foil-calibration";
import type { CardContour, RgbaImage } from "@magic-vault/shared";

export function alignFoilContour(contour: CardContour, reference: CardContour): CardContour {
  const points = [contour.topLeft, contour.topRight, contour.bottomRight, contour.bottomLeft];
  const target = [reference.topLeft, reference.topRight, reference.bottomRight, reference.bottomLeft];
  let best = points;
  let bestDistance = Infinity;
  for (let offset = 0; offset < 4; offset++) {
    const candidate = points.map((_, index) => points[(index + offset) % 4]);
    const distance = candidate.reduce((sum, point, index) =>
      sum + Math.hypot(point.x - target[index].x, point.y - target[index].y), 0);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return { topLeft: best[0], topRight: best[1], bottomRight: best[2], bottomLeft: best[3] };
}

export function foilCornerShift(first: CardContour, repeat: CardContour, width: number, height: number) {
  const corners = ["topLeft", "topRight", "bottomRight", "bottomLeft"] as const;
  return Math.max(...corners.map((key) =>
    Math.hypot(first[key].x - repeat[key].x, first[key].y - repeat[key].y))) / Math.hypot(width, height);
}

export function foilReferenceIndex(frames: { lit: boolean; detected: boolean }[]): number {
  const lit = frames.findIndex((frame) => frame.lit && frame.detected);
  return lit >= 0 ? lit : frames.findIndex((frame) => frame.detected);
}

export function resolveFoilContour(
  detected: CardContour | null, reference: CardContour | null, lit: boolean, width: number, height: number,
): CardContour | null {
  if (!reference) return detected;
  const aligned = detected ? alignFoilContour(detected, reference) : null;
  if (aligned && foilCornerShift(reference, aligned, width, height) <= FOIL_QUALITY_LIMITS.geometry) return aligned;
  return lit ? null : reference;
}

export function foilCardPixels(image: RgbaImage): number[] {
  if (image.width < 4 || image.height < 4 || image.data.length !== image.width * image.height * 4) {
    throw new Error("Invalid foil analysis image");
  }
  const values: number[] = [];
  const insetX = Math.max(1, Math.floor(image.width * FOIL_ANALYSIS_INSET));
  const insetY = Math.max(1, Math.floor(image.height * FOIL_ANALYSIS_INSET));
  for (let y = insetY; y < image.height - insetY; y++) {
    for (let x = insetX; x < image.width - insetX; x++) {
      const i = (y * image.width + x) * 4;
      values.push(Math.max(image.data[i], image.data[i + 1], image.data[i + 2]) / 255);
    }
  }
  return values;
}

export function measureFoilCard(values: number[]): FoilCardMetrics {
  if (!values.length || values.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) {
    throw new Error("Invalid foil analysis pixels");
  }
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const highlightCutoff = Math.max(0.6, median + 0.25);
  return {
    meanBrightness: values.reduce((sum, value) => sum + value, 0) / values.length,
    clippedFraction: values.filter((value) => value >= 250 / 255).length / values.length,
    highlightFraction: values.filter((value) => value >= highlightCutoff).length / values.length,
  };
}

export function compareFoilWhites(
  first: number[], repeat: number[], firstContour: CardContour, repeatContour: CardContour,
  width: number, height: number,
): FoilWhiteComparison {
  if (first.length !== repeat.length || !first.length || width <= 0 || height <= 0) {
    throw new Error("Incompatible foil white frames");
  }
  const firstMean = measureFoilCard(first).meanBrightness;
  const repeatMean = measureFoilCard(repeat).meanBrightness;
  const gain = repeatMean > 0 ? firstMean / repeatMean : 1;
  return {
    meanShift: repeatMean - firstMean,
    normalizedMae: first.reduce((sum, value, i) =>
      sum + Math.abs(value - Math.min(1, repeat[i] * gain)), 0) / first.length,
    cornerShiftFraction: foilCornerShift(firstContour, repeatContour, width, height),
  };
}

export function foilQualityWarnings(
  frames: FoilSampleAnalysis["frames"], comparison: FoilWhiteComparison | null | undefined,
  repeats: Pick<FoilSampleAnalysis, "ambientComparison" | "brightComparison"> = {},
): FoilSampleAnalysis["warnings"] {
  const warnings: FoilSampleAnalysis["warnings"] = [];
  if (frames.some((frame) => !frame.metrics) || comparison === null) warnings.push("missingCard");
  if (frames.some((frame) => frame.metrics && frame.metrics.clippedFraction > FOIL_QUALITY_LIMITS.clipping)) warnings.push("clipping");
  if (comparison) {
    if (Math.abs(comparison.meanShift) > FOIL_QUALITY_LIMITS.exposure) warnings.push("exposure");
    if (comparison.cornerShiftFraction > FOIL_QUALITY_LIMITS.movement) warnings.push("movement");
    if (comparison.normalizedMae > FOIL_QUALITY_LIMITS.normalizedMae) warnings.push("unstable");
  }
  if (repeats.ambientComparison !== undefined &&
    (!repeats.ambientComparison || foilQualityWarnings([], repeats.ambientComparison).length > 0)) {
    warnings.push("ambientUnstable");
  }
  if (repeats.brightComparison !== undefined &&
    (!repeats.brightComparison || foilQualityWarnings([], repeats.brightComparison).length > 0)) {
    warnings.push("brightUnstable");
  }
  return warnings;
}
