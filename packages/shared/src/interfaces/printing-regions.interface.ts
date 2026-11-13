export type PrintingMarkKey =
  | "setSymbol"
  | "listIcon"
  | "pitch"
  | "editionMarker"
  | "setCodeAndRegulationMark"
  | "firstEditionStamp"
  | "foilMarker";

export type PrintingRegionChannel = "luminance" | "redness";

export interface PrintingMarkRegion {
  key: PrintingMarkKey;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PrintingRegion extends PrintingMarkRegion {
  channel?: PrintingRegionChannel;
  gridWidth: number;
  gridHeight: number;
}

export type PrintingMarkGroups = Partial<Record<PrintingMarkKey, string>>;

export interface PrintingMarkScanGrid {
  region: PrintingRegion;
  values: Float32Array;
  columns: number;
  rows: number;
}

export interface PrintingMarkScanGrids {
  gameKey: string;
  grids: PrintingMarkScanGrid[];
}

export interface PrintingMarkAccumulator {
  cardCount: number;
  sums: Float64Array;
  squares: Float64Array;
}

export interface PrintingMarkReference {
  values: Float32Array;
  consistentMask: Uint8Array;
  consistentCells: Int32Array;
}

export interface PrintingMarkAlignment {
  column: number;
  row: number;
  correlation: number;
}

export type PrintingMarkCandidateReference =
  | PrintingMarkReference
  | "absent"
  | null
  | undefined;

export interface PrintingMarkPoint {
  x: number;
  y: number;
}

export type PrintingMarkSkipReason =
  | "noScanAreas"
  | "noReferences"
  | "singlePrinting";

export interface PrintingMarkAreaDiagnostic {
  evidence: number;
  candidateCorrelation: number | null;
  leaderCorrelation: number | null;
}

export interface PrintingMarkCandidateDiagnostic {
  cardId: string;
  evidence: number;
  areas: Partial<Record<PrintingMarkKey, PrintingMarkAreaDiagnostic>>;
}

export interface PrintingMarkMatch {
  cardId: string | null;
  replacedCardId: string | null;
  evidence: number;
  confirmed: boolean;
  candidates: PrintingMarkCandidateDiagnostic[];
  skipped?: PrintingMarkSkipReason;
  scanAreas?: string;
}

export interface PrintingMarksPayload {
  gameKey: string;
  encoded: string;
}
