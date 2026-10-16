import type {
  ColorBarRegion,
  OcrRegion,
} from "../interfaces/ocr-region.interface";

export const OCR_REGIONS_BY_GAME_KEY: Record<string, OcrRegion[]> = {
  mtg: [
    {
      field: "name",
      x: 0.058,
      y: 0.047,
      width: 0.64,
      height: 0.058,
    },
    {
      field: "setLine",
      x: 0.063,
      y: 0.934,
      width: 0.427,
      height: 0.036,
      multiline: true,
    },
    {
      field: "number",
      x: 0.064,
      y: 0.934,
      width: 0.112,
      height: 0.018,
    },
  ],
  pokemon: [
    {
      field: "name",
      x: 0.049,
      y: 0.027,
      width: 0.514,
      height: 0.07,
    },
    {
      field: "name",
      x: 0.05,
      y: 0.06,
      width: 0.607,
      height: 0.082,
      fallback: true,
    },
    {
      field: "number",
      x: 0.098,
      y: 0.949,
      width: 0.188,
      height: 0.017,
    },
    {
      field: "number",
      x: 0.782,
      y: 0.947,
      width: 0.174,
      height: 0.033,
      fallback: true,
    },
  ],
  yugioh: [
    {
      field: "name",
      x: 0.053,
      y: 0.058,
      width: 0.771,
      height: 0.047,
    },
    {
      field: "name",
      x: 0.076,
      y: 0.848,
      width: 0.842,
      height: 0.058,
      multiline: true,
      fallback: true,
    },
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
      x: 0.043,
      y: 0.548,
      width: 0.759,
      height: 0.083,
      multiline: true,
    },
    {
      field: "setLine",
      x: 0.039,
      y: 0.965,
      width: 0.182,
      height: 0.017,
    },
    {
      field: "number",
      x: 0.034,
      y: 0.964,
      width: 0.095,
      height: 0.018,
    },
  ],
  onepiece: [
    {
      field: "name",
      x: 0.128,
      y: 0.877,
      width: 0.699,
      height: 0.045,
    },
    {
      field: "setLine",
      x: 0.769,
      y: 0.93,
      width: 0.215,
      height: 0.039,
    },
  ],
  gundam: [
    {
      field: "name",
      x: 0.084,
      y: 0.6,
      width: 0.803,
      height: 0.227,
      multiline: true,
    },
    {
      field: "setLine",
      x: 0.775,
      y: 0.016,
      width: 0.224,
      height: 0.025,
    },
    {
      field: "number",
      x: 0.771,
      y: 0.019,
      width: 0.204,
      height: 0.022,
    },
  ],
  riftbound: [
    {
      field: "name",
      x: 0.113,
      y: 0.567,
      width: 0.611,
      height: 0.058,
    },
    {
      field: "setLine",
      x: 0.052,
      y: 0.961,
      width: 0.214,
      height: 0.015,
    },
    {
      field: "number",
      x: 0.122,
      y: 0.961,
      width: 0.1,
      height: 0.015,
    },
  ],
  swu: [
    {
      field: "name",
      x: 0.265,
      y: 0.069,
      width: 0.566,
      height: 0.068,
      multiline: true,
    },
    {
      field: "setLine",
      x: 0.737,
      y: 0.948,
      width: 0.205,
      height: 0.027,
    },
    {
      field: "number",
      x: 0.867,
      y: 0.951,
      width: 0.077,
      height: 0.015,
    },
  ],
  fab: [
    {
      field: "name",
      x: 0.218,
      y: 0.063,
      width: 0.607,
      height: 0.05,
    },
    {
      field: "setLine",
      x: 0.064,
      y: 0.948,
      width: 0.676,
      height: 0.02,
    },
    {
      field: "number",
      x: 0.155,
      y: 0.953,
      width: 0.067,
      height: 0.011,
    },
    {
      field: "number",
      x: 0.254,
      y: 0.949,
      width: 0.128,
      height: 0.014,
      fallback: true,
    },
  ],
};

export const COLOR_BAR_REGIONS_BY_GAME_KEY: Record<string, ColorBarRegion> = {
  fab: { x: 0.2, y: 0.03, width: 0.6, height: 0.04 },
};

export const DISTANCE_THRESHOLD = 0.4;
export const CLOSE_MATCH_DELTA = 0.05;
