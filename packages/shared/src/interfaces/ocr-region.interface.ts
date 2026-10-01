export type OcrField = "name" | "setLine";

export interface OcrRegion {
  field: OcrField;
  x: number;
  y: number;
  width: number;
  height: number;
  multiline?: boolean;
}

export type OcrReadout = Record<OcrField, string>;

export interface OcrDiagnostics {
  readout: OcrReadout;
  matchedName: string | null;
  nameScore: number | null;
}

export interface ColorBarRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}
