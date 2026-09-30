import type { OcrRegion } from "../interfaces/ocr-region.interface";

export const OCR_REGIONS_BY_GAME_KEY: Record<string, OcrRegion[]> = {
  mtg: [
    { field: "name", x: 0.07, y: 0.045, width: 0.62, height: 0.055 },
    {
      field: "setLine",
      x: 0.02,
      y: 0.94,
      width: 0.52,
      height: 0.055,
      multiline: true,
    },
  ],
  pokemon: [
    { field: "name", x: 0.18, y: 0.035, width: 0.5, height: 0.055 },
    {
      field: "setLine",
      x: 0.02,
      y: 0.91,
      width: 0.46,
      height: 0.08,
      multiline: true,
    },
  ],
  yugioh: [
    { field: "name", x: 0.07, y: 0.045, width: 0.73, height: 0.06 },
    {
      field: "setLine",
      x: 0.5,
      y: 0.705,
      width: 0.47,
      height: 0.07,
      multiline: true,
    },
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
    {
      field: "setLine",
      x: 0.02,
      y: 0.925,
      width: 0.5,
      height: 0.07,
      multiline: true,
    },
  ],
  onepiece: [
    { field: "name", x: 0.12, y: 0.835, width: 0.76, height: 0.05 },
    {
      field: "setLine",
      x: 0.58,
      y: 0.875,
      width: 0.4,
      height: 0.07,
      multiline: true,
    },
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
    {
      field: "setLine",
      x: 0.7,
      y: 0,
      width: 0.29,
      height: 0.065,
      multiline: true,
    },
  ],
  riftbound: [
    { field: "name", x: 0.09, y: 0.57, width: 0.8, height: 0.055 },
    {
      field: "setLine",
      x: 0.02,
      y: 0.93,
      width: 0.36,
      height: 0.06,
      multiline: true,
    },
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
    {
      field: "setLine",
      x: 0.64,
      y: 0.92,
      width: 0.35,
      height: 0.065,
      multiline: true,
    },
  ],
  fab: [
    { field: "name", x: 0.18, y: 0.035, width: 0.64, height: 0.055 },
    {
      field: "setLine",
      x: 0.02,
      y: 0.92,
      width: 0.46,
      height: 0.07,
      multiline: true,
    },
  ],
};

export const DISTANCE_THRESHOLD = 0.4;
export const CLOSE_MATCH_DELTA = 0.05;
