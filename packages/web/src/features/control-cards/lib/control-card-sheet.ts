import type {
  ControlCardSheetGeometry,
  ControlCardSheetLayout,
} from "@/lib/interfaces/control-cards";

function trimEdges(gridStart: number, count: number, tileSize: number, bleed: number) {
  return Array.from({ length: count }, (_, index) => [
    gridStart + index * tileSize + bleed,
    gridStart + (index + 1) * tileSize - bleed,
  ]).flat();
}

export function controlCardSheetGeometry(
  layout: ControlCardSheetLayout,
): ControlCardSheetGeometry {
  const gridWidth = layout.columns * layout.tileWidth;
  const gridHeight = layout.rows * layout.tileHeight;
  const gridLeft = (layout.pageWidth - gridWidth) / 2;
  const gridTop = (layout.pageHeight - gridHeight) / 2;
  return {
    gridLeft,
    gridTop,
    gridWidth,
    gridHeight,
    trimXs: trimEdges(gridLeft, layout.columns, layout.tileWidth, layout.bleed),
    trimYs: trimEdges(gridTop, layout.rows, layout.tileHeight, layout.bleed),
  };
}

export function percentOf(part: number, whole: number): string {
  return `${(part / whole) * 100}%`;
}
