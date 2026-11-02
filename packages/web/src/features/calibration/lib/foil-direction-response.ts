import type { RgbaImage } from "@magic-vault/shared";
import type { FoilDirectionResponse } from "@/lib/interfaces/foil-calibration";
import { FOIL_ANALYSIS_INSET, FOIL_DIRECTION_SETTINGS } from "../../../lib/constants/foil-calibration.ts";

export function measureFoilDirectionResponse(first: RgbaImage, second: RgbaImage): FoilDirectionResponse | null {
  const { width, height } = first;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 4 || height < 4 ||
    second.width !== width || second.height !== height ||
    first.data.length !== width * height * 4 || second.data.length !== width * height * 4) {
    throw new Error("Incompatible direction comparison images");
  }
  const { darkLevel, logOffset, radius, glintThreshold, minimumEligibleFraction } = FOIL_DIRECTION_SETTINGS;
  const insetX = Math.max(1, Math.floor(width * FOIL_ANALYSIS_INSET));
  const insetY = Math.max(1, Math.floor(height * FOIL_ANALYSIS_INSET));
  const ratio = new Float64Array(width * height);
  const mask = new Uint8Array(width * height);
  let regionCount = 0;
  let eligibleCount = 0;
  for (let y = insetY; y < height - insetY; y++) {
    for (let x = insetX; x < width - insetX; x++) {
      const index = y * width + x;
      const offset = index * 4;
      const a = (first.data[offset] + first.data[offset + 1] + first.data[offset + 2]) / 3;
      const b = (second.data[offset] + second.data[offset + 1] + second.data[offset + 2]) / 3;
      regionCount++;
      if (Math.max(a, b) < darkLevel) continue;
      ratio[index] = Math.log((b + logOffset) / (a + logOffset));
      mask[index] = 1;
      eligibleCount++;
    }
  }
  const eligibleFraction = eligibleCount / regionCount;
  if (eligibleFraction < minimumEligibleFraction) return null;
  const stride = width + 1;
  const sums = new Float64Array(stride * (height + 1));
  const counts = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const at = (y + 1) * stride + x + 1;
      sums[at] = ratio[index] + sums[at - 1] + sums[at - stride] - sums[at - stride - 1];
      counts[at] = mask[index] + counts[at - 1] + counts[at - stride] - counts[at - stride - 1];
    }
  }
  const box = (table: Float64Array, x0: number, y0: number, x1: number, y1: number) =>
    table[y1 * stride + x1] - table[y0 * stride + x1] - table[y1 * stride + x0] + table[y0 * stride + x0];
  const residuals: number[] = [];
  let glints = 0;
  for (let y = insetY; y < height - insetY; y++) {
    for (let x = insetX; x < width - insetX; x++) {
      const index = y * width + x;
      if (!mask[index]) continue;
      const x0 = Math.max(0, x - radius);
      const y0 = Math.max(0, y - radius);
      const x1 = Math.min(width, x + radius + 1);
      const y1 = Math.min(height, y + radius + 1);
      const residual = Math.abs(ratio[index] - box(sums, x0, y0, x1, y1) / box(counts, x0, y0, x1, y1));
      residuals.push(residual);
      if (residual > glintThreshold) glints++;
    }
  }
  residuals.sort((a, b) => a - b);
  return {
    eligibleFraction,
    residualP99: residuals[Math.floor(residuals.length * 0.99)],
    glintFraction: glints / residuals.length,
  };
}
