import type { CardContour } from "@magic-vault/shared";

export function roundedContourPath(contour: CardContour, scaleX: number, scaleY: number, radius: number): string {
  const points = [contour.topLeft, contour.topRight, contour.bottomRight, contour.bottomLeft].map((p) => ({
    x: p.x * scaleX,
    y: p.y * scaleY,
  }));
  const toward = (from: { x: number; y: number }, to: { x: number; y: number }, distance: number) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const d = Math.min(distance, length / 2);
    return { x: from.x + (dx / length) * d, y: from.y + (dy / length) * d };
  };
  const segments = points.map((curr, i) => {
    const prev = points[(i + points.length - 1) % points.length];
    const next = points[(i + 1) % points.length];
    const start = toward(curr, prev, radius);
    const end = toward(curr, next, radius);
    return `${i === 0 ? "M" : "L"}${start.x},${start.y} Q${curr.x},${curr.y} ${end.x},${end.y}`;
  });
  return `${segments.join(" ")} Z`;
}
