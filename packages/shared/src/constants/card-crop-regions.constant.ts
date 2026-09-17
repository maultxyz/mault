import type { OcrRegion } from "../interfaces/ocr-region.interface";

export interface CardCropRegions {
  art?: OcrRegion;
  name?: OcrRegion;
  bottom?: OcrRegion;
}

export const CARD_CROP_REGIONS_BY_GAME_KEY: Record<string, CardCropRegions> = {
  mtg: {
    art: { x: 0.075, y: 0.133, width: 0.82, height: 0.45 },
    name: { x: 0.065, y: 0.07, width: 0.84, height: 0.09 },
    bottom: { x: 0.055, y: 0.87, width: 0.89, height: 0.075 },
  },
  pokemon: {
    art: { x: 0.06, y: 0.1, width: 0.88, height: 0.4 },
    name: { x: 0.05, y: 0.03, width: 0.9, height: 0.08 },
    bottom: { x: 0.03, y: 0.82, width: 0.94, height: 0.18 },
  },
};

export const CARD_MATCH_RERANK_WEIGHTS = {
  full: 0.4,
  art: 0.35,
  name: 0.15,
  bottom: 0.1,
};
