import {
  FOIL_DETECTION_COLORED_MIN_BRIGHTNESS,
  FOIL_DETECTION_COLORED_MIN_SATURATION,
  FOIL_DETECTION_GRID_SIZE,
  FOIL_DETECTION_HUE_BIN_COUNT,
  FOIL_DETECTION_HUE_BIN_MIN_SHARE,
  FOIL_DETECTION_HUE_SPREAD_THRESHOLD_BY_GAME_KEY,
  FOIL_DETECTION_LOWER_REGION,
  FOIL_DETECTION_MIN_COLORED_SAMPLES,
  FOIL_DETECTION_MIN_STRONG_HUE_COUNT,
  FOIL_DETECTION_MIN_STRONGLY_COLORED_SHARE,
  FOIL_DETECTION_STRONGLY_COLORED_MIN_SATURATION,
} from "./constants/foil-detection.constant";
import { finishFamily, scanFoilType } from "./card-finishes";
import type { PlayingCard } from "./interfaces/card.interface";
import type {
  FoilDetection,
  FoilFeatures,
} from "./interfaces/foil-detection.interface";
import type { RgbaImage } from "./interfaces/vision-model.interface";

export function measureFoilFeatures(image: RgbaImage): FoilFeatures {
  const [redOffset, greenOffset, blueOffset] =
    image.channelOrder === "bgra" ? [2, 1, 0] : [0, 1, 2];
  const grid = FOIL_DETECTION_GRID_SIZE;
  const region = FOIL_DETECTION_LOWER_REGION;
  let sampleCount = 0;
  let coloredCount = 0;
  let stronglyColoredCount = 0;
  const strongHueBins = new Array<number>(FOIL_DETECTION_HUE_BIN_COUNT).fill(0);
  let hueCosineSum = 0;
  let hueSineSum = 0;

  for (let gridY = 0; gridY < grid; gridY++) {
    const y = Math.min(
      image.height - 1,
      Math.floor(image.height * (region.top + ((gridY + 0.5) / grid) * (region.bottom - region.top))),
    );
    for (let gridX = 0; gridX < grid; gridX++) {
      const x = Math.min(
        image.width - 1,
        Math.floor(image.width * (region.left + ((gridX + 0.5) / grid) * (region.right - region.left))),
      );
      const offset = (y * image.width + x) * 4;
      const red = image.data[offset + redOffset];
      const green = image.data[offset + greenOffset];
      const blue = image.data[offset + blueOffset];
      const max = Math.max(red, green, blue);
      const delta = max - Math.min(red, green, blue);
      sampleCount++;
      if (delta === 0 || max / 255 <= FOIL_DETECTION_COLORED_MIN_BRIGHTNESS) continue;
      const saturation = delta / max;
      if (saturation <= FOIL_DETECTION_COLORED_MIN_SATURATION) continue;
      let hue: number;
      if (max === red) hue = ((green - blue) / delta) % 6;
      else if (max === green) hue = (blue - red) / delta + 2;
      else hue = (red - green) / delta + 4;
      const degrees = (hue * 60 + 360) % 360;
      coloredCount++;
      if (saturation > FOIL_DETECTION_STRONGLY_COLORED_MIN_SATURATION) {
        stronglyColoredCount++;
        strongHueBins[
          Math.floor((degrees / 360) * FOIL_DETECTION_HUE_BIN_COUNT) % FOIL_DETECTION_HUE_BIN_COUNT
        ]++;
      }
      const radians = (degrees * Math.PI) / 180;
      hueCosineSum += Math.cos(radians);
      hueSineSum += Math.sin(radians);
    }
  }

  return {
    lowerHueSpread:
      coloredCount >= FOIL_DETECTION_MIN_COLORED_SAMPLES
        ? Math.max(0, 1 - Math.hypot(hueCosineSum, hueSineSum) / coloredCount)
        : 0,
    lowerStronglyColoredShare:
      sampleCount === 0 ? 0 : stronglyColoredCount / sampleCount,
    lowerStrongHueCount:
      stronglyColoredCount === 0
        ? 0
        : strongHueBins.filter(
            (count) => count / stronglyColoredCount >= FOIL_DETECTION_HUE_BIN_MIN_SHARE,
          ).length,
  };
}

export function supportsFoilDetection(gameKey: string | null | undefined): boolean {
  return !!gameKey && gameKey in FOIL_DETECTION_HUE_SPREAD_THRESHOLD_BY_GAME_KEY;
}

export function detectFoilRgba(
  image: RgbaImage,
  gameKey: string,
): FoilDetection | null {
  const threshold = FOIL_DETECTION_HUE_SPREAD_THRESHOLD_BY_GAME_KEY[gameKey];
  if (threshold === undefined) return null;
  const features = measureFoilFeatures(image);
  const hasEnoughRainbowColor =
    features.lowerStronglyColoredShare >= FOIL_DETECTION_MIN_STRONGLY_COLORED_SHARE &&
    features.lowerStrongHueCount >= FOIL_DETECTION_MIN_STRONG_HUE_COUNT;
  const foilScore = hasEnoughRainbowColor ? features.lowerHueSpread : 0;
  return { method: "rainbow", foilScore, isFoilDetected: foilScore >= threshold };
}

export function detectedFoilFamily(
  card: PlayingCard,
  fallbackFoilTypes: string[],
): string | null {
  return (
    card.foilTypes?.map(finishFamily)[0] ??
    fallbackFoilTypes.map(finishFamily)[0] ??
    null
  );
}

export function resolveScanFoilType(
  card: PlayingCard,
  sessionFoilType: string | null,
  foilDetection: FoilDetection | null | undefined,
  fallbackFoilTypes: string[],
): string | null {
  if (sessionFoilType || card.foilOnlyFoilType || !foilDetection?.isFoilDetected) {
    return scanFoilType(card, sessionFoilType);
  }
  return scanFoilType(card, detectedFoilFamily(card, fallbackFoilTypes));
}
