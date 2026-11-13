import type { PrintingMarkKey } from "./printing-regions.interface";

export interface StampTemplateRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  gridWidth: number;
  gridHeight: number;
}

export interface StampTemplate {
  stamp: string;
  key: PrintingMarkKey;
  region: StampTemplateRegion;
  values: readonly number[];
  minimumScore: number;
}

export interface StampDetection {
  stamp: string;
  score: number;
  isStampDetected: boolean;
}
