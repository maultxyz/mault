import type { OcrRegion } from "../interfaces/ocr-region.interface";

export const OCR_REGIONS_BY_GAME_KEY: Record<string, OcrRegion[]> = {
  mtg: [{ x: 0.03, y: 0.82, width: 0.94, height: 0.18 }],
  pokemon: [{ x: 0.03, y: 0.82, width: 0.94, height: 0.18 }],
};

export const DISTANCE_THRESHOLD = 0.3;
