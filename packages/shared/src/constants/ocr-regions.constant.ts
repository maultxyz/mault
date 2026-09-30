import type { OcrRegion } from "../interfaces/ocr-region.interface";

export const OCR_REGIONS_BY_GAME_KEY: Record<string, OcrRegion[]> = {
  mtg: [
    { field: "name", x: 0.07, y: 0.045, width: 0.62, height: 0.055 },
    { field: "setLine", x: 0.04, y: 0.93, width: 0.4, height: 0.05 },
  ],
  pokemon: [
    { field: "name", x: 0.18, y: 0.035, width: 0.5, height: 0.055 },
    { field: "setLine", x: 0.03, y: 0.935, width: 0.35, height: 0.045 },
  ],
  yugioh: [
    { field: "name", x: 0.07, y: 0.045, width: 0.73, height: 0.06 },
    { field: "setLine", x: 0.58, y: 0.725, width: 0.34, height: 0.04 },
  ],
  lorcana: [
    {
      field: "name",
      x: 0.07,
      y: 0.555,
      width: 0.86,
      height: 0.1,
      multiline: true,
    },
    { field: "setLine", x: 0.03, y: 0.95, width: 0.4, height: 0.04 },
  ],
  onepiece: [
    { field: "name", x: 0.12, y: 0.835, width: 0.76, height: 0.05 },
    { field: "setLine", x: 0.68, y: 0.9, width: 0.28, height: 0.035 },
  ],
  gundam: [
    {
      field: "name",
      x: 0.05,
      y: 0.6,
      width: 0.88,
      height: 0.2,
      multiline: true,
    },
    { field: "setLine", x: 0.76, y: 0.012, width: 0.2, height: 0.04 },
  ],
  riftbound: [
    { field: "name", x: 0.09, y: 0.57, width: 0.8, height: 0.055 },
    { field: "setLine", x: 0.03, y: 0.952, width: 0.25, height: 0.03 },
  ],
  swu: [
    {
      field: "name",
      x: 0.2,
      y: 0.06,
      width: 0.6,
      height: 0.095,
      multiline: true,
    },
    { field: "setLine", x: 0.73, y: 0.94, width: 0.24, height: 0.035 },
  ],
  fab: [
    { field: "name", x: 0.18, y: 0.035, width: 0.64, height: 0.055 },
    { field: "setLine", x: 0.03, y: 0.945, width: 0.35, height: 0.04 },
  ],
};

export const DISTANCE_THRESHOLD = 0.4;
export const CLOSE_MATCH_DELTA = 0.05;
