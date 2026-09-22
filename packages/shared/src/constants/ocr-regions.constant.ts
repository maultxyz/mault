import type { OcrRegion } from "../interfaces/ocr-region.interface";

export const OCR_REGIONS_BY_GAME_KEY: Record<string, OcrRegion[]> = {
  mtg: [{ x: 0.055, y: 0.87, width: 0.89, height: 0.075 }],
  pokemon: [{ x: 0.03, y: 0.82, width: 0.94, height: 0.18 }],
};

export const DISTANCE_THRESHOLD = 0.5;

// Equivalent to DISTANCE_THRESHOLD expressed as the match % shown in the UI (100 - distance * 100).
export const DEFAULT_MATCH_THRESHOLD_PERCENT = 50;
