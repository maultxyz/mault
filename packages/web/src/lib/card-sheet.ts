import type { CardSheetGeometry, CardSheetGrid } from "@/lib/interfaces/card-sheets";

function trimEdges(gridStart: number, count: number, tileSize: number, bleed: number) {
  return Array.from({ length: count }, (_, index) => [
    gridStart + index * tileSize + bleed,
    gridStart + (index + 1) * tileSize - bleed,
  ]).flat();
}

export function cardSheetGeometry(grid: CardSheetGrid): CardSheetGeometry {
  const gridWidth = grid.columns * grid.tileWidth;
  const gridHeight = grid.rows * grid.tileHeight;
  const gridLeft = (grid.pageWidth - gridWidth) / 2;
  const gridTop = (grid.pageHeight - gridHeight) / 2;
  return {
    gridLeft,
    gridTop,
    gridWidth,
    gridHeight,
    trimXs: trimEdges(gridLeft, grid.columns, grid.tileWidth, grid.bleed),
    trimYs: trimEdges(gridTop, grid.rows, grid.tileHeight, grid.bleed),
  };
}

export function percentOf(part: number, whole: number): string {
  return `${(part / whole) * 100}%`;
}
