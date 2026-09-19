import type { OcrRegion } from "../interfaces/ocr-region.interface";

export interface CardCropRegions {
  art?: OcrRegion;
  name?: OcrRegion;
  bottom?: OcrRegion;
}

export const CARD_CROP_REGIONS_BY_GAME_KEY: Record<string, CardCropRegions> = {
  mtg: {
    art: { x: 0.075, y: 0.133, width: 0.82, height: 0.45 },
  },
  pokemon: {
    art: { x: 0.06, y: 0.1, width: 0.88, height: 0.4 },
  },
};

export const CARD_MATCH_RERANK_WEIGHTS = {
  full: 0.4,
  art: 0.35,
  name: 0.15,
  bottom: 0.1,
};
