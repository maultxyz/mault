export type OcrField = "name" | "setLine" | "number" | "language";

export interface OcrRegion {
  field: OcrField;
  x: number;
  y: number;
  width: number;
  height: number;
  multiline?: boolean;
  fallback?: boolean;
  ignoredLineTexts?: string[];
  anchorLinePattern?: string;
}

export type OcrReadout = Record<OcrField, string>;

export interface OcrReadRegion {
  field: OcrField;
  fallback: boolean;
  anchored: boolean;
  box: { x0: number; y0: number; x1: number; y1: number };
}

export interface OcrRegionTrace extends OcrReadRegion {
  anchorText: string | null;
  imageDataUrl: string;
  text: string;
}

export interface OcrDiagnostics {
  readout: OcrReadout;
  matchedName: string | null;
  nameScore: number | null;
  printingConfirmed?: boolean;
  usedFallback?: boolean;
  regions?: OcrReadRegion[];
  printedPromo?: boolean | null;
  scopedToPrintedLanguage?: string | null;
}
