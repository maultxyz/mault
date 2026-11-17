import type { RgbaImage } from "@magic-vault/shared";
import type { FoilAmbientResponse } from "@/lib/interfaces/foil-calibration";
import { FOIL_AMBIENT_SETTINGS, FOIL_ANALYSIS_INSET } from "../../../lib/constants/foil-calibration.ts";

export function measureFoilAmbientResponse(
  ambient: RgbaImage, illuminated: RgbaImage,
): FoilAmbientResponse | null {
  const { width, height } = ambient;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 4 || height < 4 ||
    illuminated.width !== width || illuminated.height !== height ||
    ambient.data.length !== width * height * 4 || illuminated.data.length !== width * height * 4) {
    throw new Error("Incompatible ambient comparison images");
  }
  const { minimumChannel, maximumChannel, minimumEligibleFraction } = FOIL_AMBIENT_SETTINGS;
  const insetX = Math.max(1, Math.floor(width * FOIL_ANALYSIS_INSET));
  const insetY = Math.max(1, Math.floor(height * FOIL_ANALYSIS_INSET));
  const offsets: number[] = [];
  for (let y = insetY; y < height - insetY; y++) {
    for (let x = insetX; x < width - insetX; x++) offsets.push((y * width + x) * 4);
  }
  const channelGains: number[] = [];
  for (let channel = 0; channel < 3; channel++) {
    const ratios: number[] = [];
    for (const offset of offsets) {
      const a = ambient.data[offset + channel];
      const b = illuminated.data[offset + channel];
      if (a >= minimumChannel && a <= maximumChannel && b >= minimumChannel && b <= maximumChannel) {
        ratios.push(b / a);
      }
    }
    if (ratios.length / offsets.length < minimumEligibleFraction) return null;
    ratios.sort((a, b) => a - b);
    channelGains.push(ratios[Math.floor(ratios.length / 2)]);
  }
  const positive: number[] = [];
  let negativeTotal = 0;
  for (const offset of offsets) {
    let eligible = true;
    let pos = 0;
    let neg = 0;
    for (let channel = 0; channel < 3; channel++) {
      const a = ambient.data[offset + channel];
      const b = illuminated.data[offset + channel];
      const predicted = a * channelGains[channel];
      if (a < minimumChannel || a > maximumChannel || b < minimumChannel || b > maximumChannel ||
        predicted < minimumChannel || predicted > maximumChannel) {
        eligible = false;
        break;
      }
      const residual = (b - predicted) / 255;
      pos = Math.max(pos, residual);
      neg = Math.max(neg, -residual);
    }
    if (eligible) {
      positive.push(pos);
      negativeTotal += neg;
    }
  }
  const eligibleFraction = positive.length / offsets.length;
  if (eligibleFraction < minimumEligibleFraction) return null;
  positive.sort((a, b) => a - b);
  return {
    channelGains,
    eligibleFraction,
    positiveMean: positive.reduce((sum, value) => sum + value, 0) / positive.length,
    positiveP99: positive[Math.floor(positive.length * 0.99)],
    negativeMean: negativeTotal / positive.length,
  };
}
