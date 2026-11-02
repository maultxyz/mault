import type { RgbaImage } from "@magic-vault/shared";
import type { FoilRainbowEvidence, FoilReflectanceAnalysis, FoilReflectanceEvidence, FoilVerdict } from "@/lib/interfaces/foil-calibration";
import { FOIL_ANALYSIS_INSET, FOIL_RAINBOW_SETTINGS, FOIL_REFLECTANCE_SETTINGS, FOIL_VERDICT_LIMITS } from "../../../lib/constants/foil-calibration.ts";

const LINEAR = Float64Array.from({ length: 256 }, (_, value) => (value / 255) ** 2.2);

function median(values: Float64Array, count: number) {
  const sorted = values.slice(0, count).sort();
  return (sorted[Math.floor((count - 1) / 2)] + sorted[Math.floor(count / 2)]) / 2;
}

function validateImages(first: RgbaImage, second: RgbaImage) {
  const { width, height } = first;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 4 || height < 4 ||
    second.width !== width || second.height !== height ||
    first.data.length !== width * height * 4 || second.data.length !== width * height * 4) {
    throw new Error("Incompatible rainbow comparison images");
  }
}

function localColorMeans(colors: Float64Array, width: number, height: number, mask?: Uint8Array) {
  const stride = width + 1;
  const sums = new Float64Array(stride * (height + 1) * 4);
  const means = new Float64Array(colors.length);
  const coverage = new Float64Array(width * height);
  const radius = FOIL_RAINBOW_SETTINGS.localRadius;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const weight = mask ? mask[index] : 1;
      const at = ((y + 1) * stride + x + 1) * 4;
      for (let channel = 0; channel < 4; channel++) {
        const value = channel < 3 ? colors[index * 3 + channel] * weight : weight;
        sums[at + channel] = value + sums[at - 4 + channel] +
          sums[at - stride * 4 + channel] - sums[at - stride * 4 - 4 + channel];
      }
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width, x + radius + 1);
      const y0 = Math.max(0, y - radius);
      const y1 = Math.min(height, y + radius + 1);
      const box = (channel: number) => sums[(y1 * stride + x1) * 4 + channel] -
        sums[(y0 * stride + x1) * 4 + channel] - sums[(y1 * stride + x0) * 4 + channel] +
        sums[(y0 * stride + x0) * 4 + channel];
      const count = box(3);
      const index = y * width + x;
      coverage[index] = count / ((x1 - x0) * (y1 - y0));
      if (count === 0) continue;
      for (let channel = 0; channel < 3; channel++) means[index * 3 + channel] = box(channel) / count;
    }
  }
  return { means, coverage };
}

export function measureFoilRainbow(first: RgbaImage, second: RgbaImage): FoilRainbowEvidence {
  validateImages(first, second);
  const { width, height } = first;
  const { amplitude, chromaDistance, minimumPixels, localChromaDistance } = FOIL_RAINBOW_SETTINGS;
  const insetX = Math.max(1, Math.floor(width * FOIL_ANALYSIS_INSET));
  const insetY = Math.max(1, Math.floor(height * FOIL_ANALYSIS_INSET));
  const regionCount = (width - 2 * insetX) * (height - 2 * insetY);
  const red = new Float64Array(regionCount);
  const green = new Float64Array(regionCount);
  const blue = new Float64Array(regionCount);
  const chroma = new Float64Array(width * height * 3);
  const candidates: number[] = [];
  let area = 0;
  let localArea = 0;
  for (const [lit, unlit] of [[first, second], [second, first]] as const) {
    let count = 0;
    candidates.length = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;
        const r = Math.max(0, LINEAR[lit.data[offset]] - LINEAR[unlit.data[offset]]);
        const g = Math.max(0, LINEAR[lit.data[offset + 1]] - LINEAR[unlit.data[offset + 1]]);
        const b = Math.max(0, LINEAR[lit.data[offset + 2]] - LINEAR[unlit.data[offset + 2]]);
        const sum = r + g + b;
        const index = (y * width + x) * 3;
        chroma[index] = sum > 0 ? r / sum : 0;
        chroma[index + 1] = sum > 0 ? g / sum : 0;
        chroma[index + 2] = sum > 0 ? b / sum : 0;
        if (x < insetX || x >= width - insetX || y < insetY || y >= height - insetY) continue;
        if (sum <= amplitude * 3) continue;
        red[count] = r / sum;
        green[count] = g / sum;
        blue[count] = b / sum;
        candidates.push(y * width + x);
        count++;
      }
    }
    if (count < minimumPixels) continue;
    const r0 = median(red, count);
    const g0 = median(green, count);
    const b0 = median(blue, count);
    const { means } = localColorMeans(chroma, width, height);
    let offColor = 0;
    let localOffColor = 0;
    for (let i = 0; i < count; i++) {
      if (Math.hypot(red[i] - r0, green[i] - g0, blue[i] - b0) <= chromaDistance) continue;
      offColor++;
      let squaredDistance = 0;
      for (let channel = 0; channel < 3; channel++) {
        const index = candidates[i] * 3 + channel;
        squaredDistance += (chroma[index] - means[index]) ** 2;
      }
      if (squaredDistance > localChromaDistance ** 2) localOffColor++;
    }
    area += offColor / regionCount * 1000;
    localArea += localOffColor / regionCount * 1000;
  }
  return { rainbow: area, localRainbow: localArea };
}

export function measureFoilReflectance(first: RgbaImage, second: RgbaImage): FoilReflectanceEvidence {
  validateImages(first, second);
  const { width, height } = first;
  const { logOffset, darkLevel, clippingLevel, minimumChange, chromaResidual, minimumEligibleFraction } = FOIL_REFLECTANCE_SETTINGS;
  const insetX = Math.max(1, Math.floor(width * FOIL_ANALYSIS_INSET));
  const insetY = Math.max(1, Math.floor(height * FOIL_ANALYSIS_INSET));
  const regionCount = (width - 2 * insetX) * (height - 2 * insetY);
  const ratios = new Float64Array(width * height * 3);
  const mask = new Uint8Array(width * height);
  let eligible = 0;
  let changed = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const offset = index * 4;
      const maximumFirst = Math.max(first.data[offset], first.data[offset + 1], first.data[offset + 2]);
      const maximumSecond = Math.max(second.data[offset], second.data[offset + 1], second.data[offset + 2]);
      if (Math.min(maximumFirst, maximumSecond) < darkLevel ||
        Math.max(maximumFirst, maximumSecond) >= clippingLevel) continue;
      mask[index] = 1;
      let mean = 0;
      let maximumChange = 0;
      for (let channel = 0; channel < 3; channel++) {
        const a = first.data[offset + channel];
        const b = second.data[offset + channel];
        const value = Math.log((LINEAR[a] + logOffset) / (LINEAR[b] + logOffset));
        ratios[index * 3 + channel] = value;
        mean += value / 3;
        maximumChange = Math.max(maximumChange, Math.abs(a - b));
      }
      for (let channel = 0; channel < 3; channel++) ratios[index * 3 + channel] -= mean;
      if (x >= insetX && x < width - insetX && y >= insetY && y < height - insetY) {
        eligible++;
        if (maximumChange > minimumChange) changed++;
      }
    }
  }
  const { means, coverage } = localColorMeans(ratios, width, height, mask);
  let count = 0;
  for (let y = insetY; y < height - insetY; y++) {
    for (let x = insetX; x < width - insetX; x++) {
      const index = y * width + x;
      if (!mask[index] || coverage[index] < minimumEligibleFraction) continue;
      let distance = 0;
      for (let channel = 0; channel < 3; channel++) {
        distance += (ratios[index * 3 + channel] - means[index * 3 + channel]) ** 2;
      }
      if (distance > chromaResidual ** 2) count++;
    }
  }
  return { score: count / regionCount * 1000, eligibleFraction: eligible / regionCount, changedFraction: changed / regionCount };
}

export function foilVerdict(evidence: FoilReflectanceAnalysis, reliable: boolean): FoilVerdict {
  const { first, repeat, led0Noise, farNoise } = evidence;
  for (const item of [first, repeat, led0Noise, farNoise]) {
    if (item && (!Number.isFinite(item.score) || item.score < 0 || item.score > 1000 ||
      [item.eligibleFraction, item.changedFraction].some((value) => !Number.isFinite(value) || value < 0 || value > 1))) {
      throw new Error("Invalid reflectance evidence");
    }
  }
  if (!reliable || !first || !repeat || !led0Noise || !farNoise) return "uncertain";
  if ([first, repeat, led0Noise, farNoise].some((item) =>
    item.eligibleFraction < FOIL_REFLECTANCE_SETTINGS.minimumEligibleFraction) ||
    [first, repeat].some((item) => item.changedFraction < FOIL_REFLECTANCE_SETTINGS.minimumChangedFraction) ||
    Math.max(led0Noise.score, farNoise.score) > FOIL_VERDICT_LIMITS.nonFoilMaximum) return "uncertain";
  if (Math.max(first.score, repeat.score) <= FOIL_VERDICT_LIMITS.nonFoilMaximum) return "nonFoil";
  if (Math.min(first.score, repeat.score) >= FOIL_VERDICT_LIMITS.foilMinimum) return "foil";
  return "uncertain";
}
