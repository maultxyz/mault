import type { CardSheetCutLinesProps } from "@/lib/interfaces/card-sheets";

export function CardSheetCutLines({ grid, geometry, color, width }: CardSheetCutLinesProps) {
  const gridBottom = geometry.gridTop + geometry.gridHeight;
  const gridRight = geometry.gridLeft + geometry.gridWidth;
  return (
    <g stroke={color} strokeWidth={width}>
      {geometry.trimXs.map((trimX) => (
        <g key={`x-${trimX}`}>
          <line x1={trimX} x2={trimX} y1={0} y2={geometry.gridTop} />
          <line x1={trimX} x2={trimX} y1={gridBottom} y2={grid.pageHeight} />
        </g>
      ))}
      {geometry.trimYs.map((trimY) => (
        <g key={`y-${trimY}`}>
          <line x1={0} x2={geometry.gridLeft} y1={trimY} y2={trimY} />
          <line x1={gridRight} x2={grid.pageWidth} y1={trimY} y2={trimY} />
        </g>
      ))}
    </g>
  );
}
