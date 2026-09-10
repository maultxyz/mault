import path from "node:path";

export const TESSERACT_CACHE_PATH =
  process.env.TESSERACT_CACHE_PATH ??
  path.join(process.cwd(), ".cache", "tesseract");
export const REGION_MARGIN_X = 0.015;
export const REGION_MARGIN_Y = 0.015;
