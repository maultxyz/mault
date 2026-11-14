import { STATS_DONUT } from "@/lib/constants/stats";
import type { DonutChartProps } from "@/lib/interfaces/stats";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function DonutChart({ segments, centerValue, centerLabel, formatShare }: DonutChartProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const visible = segments.filter((segment) => segment.value > 0);
  const total = visible.reduce((sum, segment) => sum + segment.value, 0);
  if (total <= 0) return null;

  const { size, strokeWidth, gap, dimmedOpacity } = STATS_DONUT;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const gapLength = visible.length > 1 ? gap : 0;
  const selected = visible.find((segment) => segment.key === selectedKey) ?? null;
  const offsets = visible.map((_, index) =>
    visible.slice(0, index).reduce((sum, segment) => sum + (segment.value / total) * circumference, 0),
  );

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg aria-hidden width={size} height={size} className="-rotate-90">
          {visible.map((segment, index) => {
            const dash = Math.max((segment.value / total) * circumference - gapLength, 1);
            return (
              <circle
                key={segment.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offsets[index]}
                opacity={selected && selected.key !== segment.key ? dimmedOpacity : 1}
                className="transition-opacity motion-reduce:transition-none"
              />
            );
          })}
        </svg>
        <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <span className="text-lg font-bold tabular-nums text-foreground">
            {selected ? formatShare(selected.value, total) : centerValue}
          </span>
          <span className="line-clamp-2 text-2xs text-foreground/70">{selected ? selected.label : centerLabel}</span>
        </div>
      </div>
      <ul className="flex w-full min-w-0 flex-col gap-0.5">
        {visible.map((segment) => {
          const isSelected = selected?.key === segment.key;
          return (
            <li key={segment.key}>
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedKey(isSelected ? null : segment.key)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                  isSelected && "bg-primary/10 dark:bg-primary/20",
                )}
              >
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="min-w-0 flex-1 truncate text-foreground">{segment.label}</span>
                <span className="font-semibold tabular-nums text-foreground">{formatShare(segment.value, total)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
