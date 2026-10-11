import path from "node:path";

export const TESSERACT_CACHE_PATH =
  process.env.TESSERACT_CACHE_PATH ??
  path.join(process.cwd(), ".cache", "tesseract");
export const REGION_MARGIN_X = 0.015;
export const REGION_MARGIN_Y = 0.015;
export const OCR_NAME_MIN_LENGTH = 3;
export const OCR_NAME_MIN_SIMILARITY = 0.45;
export const OCR_NAME_CANDIDATE_LIMIT = 60;
export const OCR_MAX_NAME_LINES = 8;
export const OCR_UPSCALE_FACTOR = 3;
export const OCR_DARK_BACKGROUND_THRESHOLD = 128;
export const OCR_SEARCH_MARGIN_X = 0.04;
export const OCR_SEARCH_MARGIN_Y = 0.05;
export const OCR_ANCHOR_MIN_WORD_CONFIDENCE = 40;
export const OCR_ANCHOR_HEIGHT_WEIGHT = 0.5;
export const OCR_ANCHOR_MIN_LINE_HEIGHT_RATIO = 0.3;
