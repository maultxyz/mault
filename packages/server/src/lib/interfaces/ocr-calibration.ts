import type { OcrField, OcrRegion } from "@magic-vault/shared";

export interface OcrBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrPagePixels {
  data: Buffer;
  width: number;
  height: number;
}

export interface OcrPageWord {
  text: string;
  box: OcrBox;
}

export interface OcrPageLine {
  words: OcrPageWord[];
  box: OcrBox;
}

export interface OcrCalibrationTarget {
  name: string;
  setCode: string;
  collectorNumber: string;
}

export interface OcrFieldObservation {
  box: OcrBox;
  lineCount: number;
}

export type OcrCardObservations = Partial<
  Record<OcrField, OcrFieldObservation>
>;

export interface OcrRegionCluster {
  region: OcrRegion;
  support: number;
  share: number;
}

export interface OcrFieldCalibration {
  field: OcrField;
  found: number;
  clusters: OcrRegionCluster[];
  combined: OcrRegion | null;
}

export interface OcrCalibrationReport {
  gameKey: string;
  lang: string;
  sampled: number;
  read: number;
  fields: OcrFieldCalibration[];
  proposed: OcrRegion[];
  current: OcrRegion[];
}

export interface OcrCalibrationAllReport {
  lang: string;
  reports: OcrCalibrationReport[];
  regions: Record<string, OcrRegion[]>;
}

export interface OcrCalibrationOptions {
  gameKey: string;
  lang: string;
  sample: number;
  out: string | null;
}
