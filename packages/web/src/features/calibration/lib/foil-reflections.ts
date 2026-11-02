import type { RgbaImage } from "@magic-vault/shared";
import type { FoilReflectionMetrics } from "@/lib/interfaces/foil-calibration";
import { FOIL_ANALYSIS_INSET, FOIL_REFLECTION_SETTINGS } from "../../../lib/constants/foil-calibration.ts";

export function measureFoilReflections(image: RgbaImage): FoilReflectionMetrics {
  const { width, height, data } = image;
  const { radius, minimumIntensity, minimumContrast, minimumArea } = FOIL_REFLECTION_SETTINGS;
  if (!Number.isInteger(width) || !Number.isInteger(height) ||
    width <= radius * 2 || height <= radius * 2 || data.length !== width * height * 4) {
    throw new Error("Invalid reflection analysis image");
  }
  const stride = width + 1;
  const integral = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      row += Math.max(data[i], data[i + 1], data[i + 2]) / 255;
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + row;
    }
  }
  const sum = (x: number, y: number, r: number) =>
    integral[(y + r + 1) * stride + x + r + 1] -
    integral[(y - r) * stride + x + r + 1] -
    integral[(y + r + 1) * stride + x - r] +
    integral[(y - r) * stride + x - r];
  const insetX = Math.max(radius, Math.floor(width * FOIL_ANALYSIS_INSET));
  const insetY = Math.max(radius, Math.floor(height * FOIL_ANALYSIS_INSET));
  const mask = new Uint8Array(width * height);
  const contrasts: number[] = [];
  const ringArea = (radius * 2 + 1) ** 2 - 9;
  let spotPixels = 0;
  for (let y = insetY; y < height - insetY; y++) {
    for (let x = insetX; x < width - insetX; x++) {
      const centerSum = sum(x, y, 1);
      const center = centerSum / 9;
      const ring = (sum(x, y, radius) - centerSum) / ringArea;
      const contrast = Math.max(0, center - ring);
      contrasts.push(contrast);
      if (center >= minimumIntensity && contrast >= minimumContrast) {
        mask[y * width + x] = 1;
        spotPixels++;
      }
    }
  }
  let spotCount = 0;
  let largestArea = 0;
  let largestCompactness = 0;
  for (let index = 0; index < mask.length; index++) {
    if (!mask[index]) continue;
    const pending = [index];
    mask[index] = 0;
    let area = 0;
    let minX = width, maxX = 0, minY = height, maxY = 0;
    while (pending.length) {
      const pixel = pending.pop()!;
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      area++;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      for (const neighbor of [pixel - width, pixel + width, pixel - 1, pixel + 1]) {
        if (neighbor >= 0 && neighbor < mask.length && mask[neighbor] &&
          Math.abs(neighbor % width - x) + Math.abs(Math.floor(neighbor / width) - y) === 1) {
          mask[neighbor] = 0;
          pending.push(neighbor);
        }
      }
    }
    if (area >= minimumArea) {
      spotCount++;
      if (area > largestArea) {
        largestArea = area;
        largestCompactness = area / ((maxX - minX + 1) * (maxY - minY + 1));
      }
    }
  }
  contrasts.sort((a, b) => a - b);
  return {
    peakContrast: contrasts[Math.min(contrasts.length - 1, Math.floor(contrasts.length * 0.999))],
    spotFraction: spotPixels / contrasts.length,
    spotCount,
    largestSpotFraction: largestArea / contrasts.length,
    largestSpotCompactness: largestCompactness,
  };
}
