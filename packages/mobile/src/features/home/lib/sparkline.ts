import type { ChartPoint, SparklinePaths } from "@/lib/interfaces/home";

export function sparklinePaths(values: number[], width: number, height: number, top: number): SparklinePaths | null {
  if (values.length < 2 || width <= 0 || height <= 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => ({
    x: (index / (values.length - 1)) * width,
    y: top + height - ((value - min) / range) * height,
  }));
  const line = smoothLinePath(points);
  const bottom = top + height;
  return { line, area: `${line} L ${width} ${bottom + 1000} L 0 ${bottom + 1000} Z` };
}

export function smoothLinePath(points: ChartPoint[], maxY = Number.POSITIVE_INFINITY): string {
  let line = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const afterNext = points[index + 2] ?? next;
    const firstControlX = current.x + (next.x - previous.x) / 6;
    const firstControlY = Math.min(current.y + (next.y - previous.y) / 6, maxY);
    const secondControlX = next.x - (afterNext.x - current.x) / 6;
    const secondControlY = Math.min(next.y - (afterNext.y - current.y) / 6, maxY);
    line += ` C ${firstControlX} ${firstControlY} ${secondControlX} ${secondControlY} ${next.x} ${next.y}`;
  }
  return line;
}
