import { sparklinePaths } from "@magic-vault/shared";
import { LIBRARY_CHANGE_SPARKLINE } from "@/lib/constants/library";
import type { CollectionChangeTrendProps } from "@/lib/interfaces/library";
import { cn } from "@/lib/utils";

export function CollectionChangeTrend({ values, baseline, change, noChangeLabel, label, className }: CollectionChangeTrendProps) {
  const { width, height, strokeWidth, baselineDash } = LIBRARY_CHANGE_SPARKLINE;
  const sparkline = sparklinePaths(values, width, height, 0);
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const baselineY = height - (((baseline ?? values[0] ?? min) - min) / range) * height;
  const direction = change?.direction ?? "flat";

  return (
    <span className={cn("flex shrink-0 items-center gap-2", className)}>
      <span className="block" style={{ width, height }} aria-hidden="true">
        {sparkline && baseline != null && (
          <svg width={width} height={height} className="overflow-visible">
            <line
              x1={0}
              x2={width}
              y1={baselineY}
              y2={baselineY}
              className="stroke-foreground/50"
              strokeWidth={1}
              strokeDasharray={baselineDash}
              strokeLinecap="round"
            />
            <path
              d={sparkline.line}
              fill="none"
              className={cn(
                direction === "up"
                  ? "stroke-success-foreground"
                  : direction === "down"
                    ? "stroke-destructive-strong dark:stroke-destructive"
                    : "stroke-foreground/50",
              )}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "min-w-18 rounded-sm px-2 py-0.5 text-center text-xs font-semibold tabular-nums",
          direction === "up"
            ? "bg-success text-black"
            : direction === "down"
              ? "bg-destructive-strong text-white"
              : "bg-foreground/6 text-foreground",
        )}
      >
        {change ? change.change : noChangeLabel}
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
