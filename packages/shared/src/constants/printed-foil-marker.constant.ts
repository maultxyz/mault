import type { PrintedFoilMarkerBand } from "../interfaces/printed-foil-marker.interface";

export const PRINTED_FOIL_MARKER_BANDS_BY_GAME_KEY: Record<
  string,
  PrintedFoilMarkerBand
> = {
  mtg: { x: 0.025, y: 0.935, width: 0.3, height: 0.05 },
};

export const PRINTED_FOIL_MARKER_TEXT_CONTRAST = 70;
export const PRINTED_FOIL_MARKER_MIN_ROW_TEXT_SHARE = 0.04;
export const PRINTED_FOIL_MARKER_MIN_LINE_HEIGHT_PX = 4;
export const PRINTED_FOIL_MARKER_MAX_LINE_HEIGHT = 0.025;
export const PRINTED_FOIL_MARKER_MIN_COMPONENT_AREA_PX = 3;
export const PRINTED_FOIL_MARKER_MIN_SET_CODE_GLYPHS = 2;
export const PRINTED_FOIL_MARKER_LANGUAGE_GAP_RATIO = 0.6;
export const PRINTED_FOIL_MARKER_DOT_MAX_HEIGHT_RATIO = 0.55;
export const PRINTED_FOIL_MARKER_DOT_MAX_WIDTH_RATIO = 0.6;
export const PRINTED_FOIL_MARKER_STAR_MIN_HEIGHT_RATIO = 0.6;
export const PRINTED_FOIL_MARKER_STAR_MIN_SHAPE_SCORE = 0.4;
export const PRINTED_FOIL_MARKER_STAR_GRID_SIZE = 9;
