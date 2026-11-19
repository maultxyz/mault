import type { CardContour } from "@magic-vault/shared";
import type { CoverTransform } from "@/lib/interfaces/scanner";

export function coverTransform(frameWidth: number, frameHeight: number, viewWidth: number, viewHeight: number): CoverTransform {
  const scale = Math.max(viewWidth / frameWidth, viewHeight / frameHeight);
  return {
    scale,
    offsetX: (viewWidth - frameWidth * scale) / 2,
    offsetY: (viewHeight - frameHeight * scale) / 2,
  };
}

export function roundedContourPath(contour: CardContour, transform: CoverTransform, radius: number): string {
  const points = [contour.topLeft, contour.topRight, contour.bottomRight, contour.bottomLeft].map((p) => ({
    x: transform.offsetX + p.x * transform.scale,
    y: transform.offsetY + p.y * transform.scale,
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
