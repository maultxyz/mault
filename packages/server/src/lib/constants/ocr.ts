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
