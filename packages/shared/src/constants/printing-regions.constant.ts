import type { PrintingRegion } from "../interfaces/printing-regions.interface";

export const PRINTING_REGIONS_BY_GAME_KEY: Record<string, PrintingRegion[]> = {
  mtg: [
    {
      key: "listIcon",
      x: 0.004,
      y: 0.945,
      width: 0.04,
      height: 0.04,
      gridWidth: 12,
      gridHeight: 12,
    },
  ],
  fab: [
    {
      key: "pitch",
      channel: "redness",
      x: 0.035,
      y: 0.03,
      width: 0.14,
      height: 0.085,
      gridWidth: 20,
      gridHeight: 12,
    },
    {
      key: "editionMarker",
      x: 0.2,
      y: 0.945,
      width: 0.12,
      height: 0.025,
      gridWidth: 24,
      gridHeight: 6,
    },
  ],
  pokemon: [
    {
      key: "setSymbol",
      x: 0.84,
      y: 0.51,
      width: 0.14,
      height: 0.07,
      gridWidth: 24,
      gridHeight: 14,
    },
    {
      key: "setCodeAndRegulationMark",
      x: 0.025,
      y: 0.935,
      width: 0.13,
      height: 0.035,
      gridWidth: 26,
      gridHeight: 8,
    },
  ],
};

export const PRINTING_MARK_SEARCH_MARGIN = 0.02;
export const PRINTING_MARK_SUBSAMPLES_PER_CELL = 3;
export const PRINTING_MARK_MIN_GROUP_CARDS = 3;
export const PRINTING_MARK_MAX_CELL_STD = 28;
export const PRINTING_MARK_MIN_CELL_DIFFERENCE = 30;
export const PRINTING_MARK_MIN_DIFFERING_CELLS = 4;
export const PRINTING_MARK_MIN_SHARED_CELLS = 8;
export const PRINTING_MARK_MIN_CALIBRATION_STD = 8;
export const PRINTING_MARK_PRESENT_MIN_CORRELATION = 0.55;
export const PRINTING_MARK_ABSENT_MAX_CORRELATION = 0.2;
export const PRINTING_MARK_MAX_LEADER_DISTANCE_GAP = 0.05;
export const PRINTING_MARK_REORDER_MARGIN = 0.25;
export const PRINTING_MARK_CONFIRM_MARGIN = 0.6;
