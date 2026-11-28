export interface CardSheetGrid {
  pageWidth: number;
  pageHeight: number;
  columns: number;
  rows: number;
  tileWidth: number;
  tileHeight: number;
  bleed: number;
}

export interface CardSheetGeometry {
  gridLeft: number;
  gridTop: number;
  gridWidth: number;
  gridHeight: number;
  trimXs: number[];
  trimYs: number[];
}

export interface CardSheetCutLinesProps {
  grid: CardSheetGrid;
  geometry: CardSheetGeometry;
  color: string;
  width: number;
}
