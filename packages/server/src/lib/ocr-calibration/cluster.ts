import type { OcrField, OcrRegion } from "@magic-vault/shared";
import {
  OCR_CALIBRATION_CLUSTER_MAX_CENTER_DY,
  OCR_CALIBRATION_COMBINE_BELOW_SHARE,
  OCR_CALIBRATION_EDGE_PERCENTILE,
  OCR_CALIBRATION_MIN_CLUSTER_SHARE,
  OCR_CALIBRATION_MIN_CLUSTER_SUPPORT,
  OCR_CALIBRATION_MULTILINE_SHARE,
  OCR_CALIBRATION_REGION_PRECISION,
} from "../constants/ocr-calibration";
import type {
  OcrBox,
  OcrFieldCalibration,
  OcrFieldObservation,
} from "../interfaces/ocr-calibration";

function percentile(values: number[], fraction: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round(fraction * (sorted.length - 1))),
  );
  return sorted[index];
}

function median(values: number[]): number {
  return percentile(values, 0.5);
}

function centerY(box: OcrBox): number {
  return (box.y0 + box.y1) / 2;
}

function clusterCenter(members: OcrFieldObservation[]): OcrBox {
  return {
    x0: median(members.map(({ box }) => box.x0)),
    y0: median(members.map(({ box }) => box.y0)),
    x1: median(members.map(({ box }) => box.x1)),
    y1: median(members.map(({ box }) => box.y1)),
  };
}

function belongsTo(
  observation: OcrFieldObservation,
  members: OcrFieldObservation[],
): boolean {
  const center = clusterCenter(members);
  return (
    Math.abs(centerY(observation.box) - centerY(center)) <=
      OCR_CALIBRATION_CLUSTER_MAX_CENTER_DY &&
    observation.box.x0 < center.x1 &&
    center.x0 < observation.box.x1
  );
}

export function clusterObservations(
  observations: OcrFieldObservation[],
): OcrFieldObservation[][] {
  const clusters: OcrFieldObservation[][] = [];
  for (const observation of observations) {
    const cluster = clusters.find((members) =>
      belongsTo(observation, members),
    );
    if (cluster) cluster.push(observation);
    else clusters.push([observation]);
  }
  return clusters;
}

function round(value: number): number {
  const clamped = Math.min(1, Math.max(0, value));
  return (
    Math.round(clamped * OCR_CALIBRATION_REGION_PRECISION) /
    OCR_CALIBRATION_REGION_PRECISION
  );
}

export function regionFromCluster(
  field: OcrField,
  members: OcrFieldObservation[],
): OcrRegion {
  const low = OCR_CALIBRATION_EDGE_PERCENTILE;
  const high = 1 - OCR_CALIBRATION_EDGE_PERCENTILE;
  const x = round(percentile(members.map(({ box }) => box.x0), low));
  const y = round(percentile(members.map(({ box }) => box.y0), low));
  const right = round(percentile(members.map(({ box }) => box.x1), high));
  const bottom = round(percentile(members.map(({ box }) => box.y1), high));
  const multilineShare =
    members.filter(({ lineCount }) => lineCount > 1).length / members.length;
  return {
    field,
    x,
    y,
    width: round(right - x),
    height: round(bottom - y),
    ...(multilineShare >= OCR_CALIBRATION_MULTILINE_SHARE
      ? { multiline: true }
      : {}),
  };
}

export function combineClusters(
  field: OcrField,
  regions: OcrRegion[],
): OcrRegion | null {
  if (regions.length < 2) return null;
  const x = Math.min(...regions.map((region) => region.x));
  const y = Math.min(...regions.map((region) => region.y));
  const right = Math.max(...regions.map((region) => region.x + region.width));
  const bottom = Math.max(
    ...regions.map((region) => region.y + region.height),
  );
  return {
    field,
    x: round(x),
    y: round(y),
    width: round(right - x),
    height: round(bottom - y),
    multiline: true,
  };
}

export function calibrateField(
  field: OcrField,
  observations: OcrFieldObservation[],
): OcrFieldCalibration {
  const found = observations.length;
  const clusters = clusterObservations(observations)
    .map((members) => ({
      region: regionFromCluster(field, members),
      support: members.length,
      share: found === 0 ? 0 : members.length / found,
    }))
    .filter(
      ({ support, share }) =>
        support >= OCR_CALIBRATION_MIN_CLUSTER_SUPPORT &&
        share >= OCR_CALIBRATION_MIN_CLUSTER_SHARE,
    )
    .sort((a, b) => b.support - a.support);
  return {
    field,
    found,
    clusters,
    combined: combineClusters(
      field,
      clusters.map(({ region }) => region),
    ),
  };
}

export function proposeRegions(calibration: OcrFieldCalibration): OcrRegion[] {
  const [primary, ...alternates] = calibration.clusters;
  if (!primary) return [];
  if (
    calibration.combined &&
    primary.share < OCR_CALIBRATION_COMBINE_BELOW_SHARE
  ) {
    return [calibration.combined];
  }
  return [
    primary.region,
    ...alternates.map(({ region }) => ({ ...region, fallback: true })),
  ];
}
