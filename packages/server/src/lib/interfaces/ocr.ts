import type { OcrReadout } from "@magic-vault/shared";
import type { InferenceSession } from "onnxruntime-node";
import type { OcrBox } from "./ocr-calibration";

export interface OcrRegionReadouts {
  primary: OcrReadout;
  fallback: OcrReadout;
}

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

export interface OcrTextBox {
  box: OcrBox;
  text: string;
  confidence: number;
}

export interface PaddleOcrSessions {
  detection: InferenceSession;
  recognition: InferenceSession;
  dictionary: string[];
}

export interface OcrRgbPixels {
  data: Buffer;
  width: number;
  height: number;
}
