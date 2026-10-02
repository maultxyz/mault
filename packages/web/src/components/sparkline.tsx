import type { SparklineProps } from "@/lib/interfaces/sparkline";
import { cn } from "@/lib/utils";
import {
  SPARKLINE_HEIGHT as HEIGHT,
  SPARKLINE_PADDING as PAD,
  SPARKLINE_WIDTH as WIDTH,
} from "@/lib/constants/sparkline";
import { useState } from "react";

export function Sparkline({
  values,
  formatPoint,
  ariaLabel,
  className,
}: SparklineProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  if (values.length < 2) return null;

  const max = Math.max(1, ...values);
  const step = (WIDTH - PAD * 2) / (values.length - 1);
  const points = values.map((value, index) => ({
    x: PAD + index * step,
    y: HEIGHT - PAD - (value / max) * (HEIGHT - PAD * 2),
  }));
  const path = points.map((p) => `${p.x},${p.y}`).join(" ");
  const last = points[points.length - 1];
  const active = hovered != null ? points[hovered] : null;

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-7 w-full overflow-visible"
        role="img"
        aria-label={ariaLabel}
        onMouseLeave={() => setHovered(null)}
      >
        <polyline
          points={path}
          fill="none"
          className="stroke-foreground/30"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {active && (
          <line
            x1={active.x}
            x2={active.x}
            y1={PAD / 2}
            y2={HEIGHT - PAD / 2}
            className="stroke-border"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
        <circle
          cx={(active ?? last).x}
          cy={(active ?? last).y}
          r={3}
          className="fill-primary stroke-background"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        {points.map((p, index) => (
          <rect
            key={index}
            x={p.x - step / 2}
            y={0}
            width={step}
            height={HEIGHT}
            fill="transparent"
            onMouseEnter={() => setHovered(index)}
          />
        ))}
      </svg>
      {hovered != null && active && (
        <div
          className="pointer-events-none absolute bottom-full z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
          style={{ left: `${(active.x / WIDTH) * 100}%` }}
        >
          {formatPoint(values[hovered], hovered)}
        </div>
      )}
    </div>
  );
}
