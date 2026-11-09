export type PrintedFoilMarker = "star" | "dot";

export interface PrintedFoilMarkerDetection {
  marker: PrintedFoilMarker | null;
  glyphHeightRatio: number | null;
  glyphWidthRatio: number | null;
  starShapeScore: number | null;
}

export interface PrintedFoilMarkerBand {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextRun {
  start: number;
  end: number;
}

export interface TextComponent {
  left: number;
  right: number;
  top: number;
  bottom: number;
  pixels: [number, number][];
}
