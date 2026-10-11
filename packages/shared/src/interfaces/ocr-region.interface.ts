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
