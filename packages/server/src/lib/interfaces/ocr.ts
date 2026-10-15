import type { OcrBox } from "./ocr-calibration";

export interface OcrRectangle {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface OcrAnchor {
  box: OcrBox;
  text: string;
}

export interface OcrRegionLocation {
  box: OcrBox;
  anchored: boolean;
  anchorText: string | null;
}
