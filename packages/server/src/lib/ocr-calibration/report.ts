import type { OcrRegion } from "@magic-vault/shared";
import type { OcrCalibrationReport } from "../interfaces/ocr-calibration";
import {
  OCR_CALIBRATION_COMBINE_BELOW_SHARE,
  OCR_CALIBRATION_FIELDS,
} from "../constants/ocr-calibration";
import { boxIou } from "./match";

function regionBox(region: OcrRegion) {
  return {
    x0: region.x,
    y0: region.y,
    x1: region.x + region.width,
    y1: region.y + region.height,
  };
}

function describeRegion(region: OcrRegion): string {
  const multiline = region.multiline ? ", multiline" : "";
  return `x ${region.x}, y ${region.y}, w ${region.width}, h ${region.height}${multiline}`;
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatCalibrationReport(report: OcrCalibrationReport): string {
  const lines = [
    `OCR region calibration for ${report.gameKey} (${report.lang}): ${report.read} of ${report.sampled} card(s) read`,
    "",
  ];

  for (const field of report.fields) {
    const current = report.current.find(
      (region) => region.field === field.field,
    );
    lines.push(
      `${field.field}: found on ${field.found} of ${report.read} card(s) (${percent(report.read === 0 ? 0 : field.found / report.read)})`,
    );
    if (current) lines.push(`  current   ${describeRegion(current)}`);
    if (field.clusters.length === 0) lines.push("  no layout found");
    field.clusters.forEach((cluster, index) => {
      const overlap = current
        ? `, IoU with current ${boxIou(regionBox(cluster.region), regionBox(current)).toFixed(2)}`
        : "";
      lines.push(
        `  ${index === 0 ? "primary " : "fallback"} ${describeRegion(cluster.region)} (${cluster.support} card(s), ${percent(cluster.share)}${overlap})`,
      );
    });
    if (field.combined) {
      lines.push(
        `  combined ${describeRegion(field.combined)} (covers every layout above${field.clusters[0].share < OCR_CALIBRATION_COMBINE_BELOW_SHARE ? ", used since no layout covers half the cards" : ""})`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function mergeWithCurrent(report: OcrCalibrationReport): OcrRegion[] {
  return OCR_CALIBRATION_FIELDS.flatMap((field) => {
    const proposed = report.proposed.filter(
      (region) => region.field === field,
    );
    return proposed.length > 0
      ? proposed
      : report.current.filter((region) => region.field === field);
  });
}

function toTsLiteral(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(/"(\w+)":/g, "$1:");
}

export function formatRegionsSnippet(
  gameKey: string,
  regions: OcrRegion[],
): string {
  return `${gameKey}: ${toTsLiteral(regions)},`;
}

export function formatAllRegions(
  regionsByGameKey: Record<string, OcrRegion[]>,
): string {
  return `export const OCR_REGIONS_BY_GAME_KEY: Record<string, OcrRegion[]> = ${toTsLiteral(regionsByGameKey)};`;
}

export function describeRegionSource(
  gameKey: string,
  report: OcrCalibrationReport | undefined,
): string {
  if (!report) return `${gameKey}: kept current (no stored cards to calibrate)`;
  const calibrated = OCR_CALIBRATION_FIELDS.filter((field) =>
    report.proposed.some((region) => region.field === field),
  );
  const kept = OCR_CALIBRATION_FIELDS.filter(
    (field) =>
      !calibrated.includes(field) &&
      report.current.some((region) => region.field === field),
  );
  const parts = [
    calibrated.length > 0 ? `calibrated ${calibrated.join(", ")}` : null,
    kept.length > 0 ? `kept current ${kept.join(", ")}` : null,
  ].filter(Boolean);
  return `${gameKey}: ${parts.join("; ") || "no regions"} (${report.read} card(s) read)`;
}
