export type OcrField = "name" | "setLine" | "number";

export interface OcrRegion {
  field: OcrField;
  x: number;
  y: number;
  width: number;
  height: number;
  multiline?: boolean;
  fallback?: boolean;
}

export type OcrReadout = Record<OcrField, string>;

export interface OcrRegionTrace {
  field: OcrField;
  fallback: boolean;
  anchored: boolean;
  anchorText: string | null;
  box: { x0: number; y0: number; x1: number; y1: number };
  imageDataUrl: string;
  text: string;
}

export interface OcrDiagnostics {
  readout: OcrReadout;
  matchedName: string | null;
  nameScore: number | null;
  printingConfirmed?: boolean;
  usedFallback?: boolean;
}

export interface ColorBarRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}
