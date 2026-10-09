import type { ColumnChartProps } from "@/lib/interfaces/stats";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function ColumnChart({
  data,
  formatValue,
  ariaLabel,
  endLabel,
}: ColumnChartProps) {
  const [selected, setSelected] = useState<number | null>(null);
  if (data.length === 0) return null;

  const max = Math.max(...data.map((datum) => datum.value), 0) || 1;
  const index = Math.min(selected ?? data.length - 1, data.length - 1);
  const current = data[index];

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-xs text-foreground tabular-nums">
        <span className="text-foreground/70">{current.label}: </span>
        <span className="font-semibold">{formatValue(current.value)}</span>
      </figcaption>
      <div
        role="group"
        aria-label={ariaLabel}
        className="flex h-28 items-end gap-0.5 border-b md:h-40"
        onPointerLeave={() => setSelected(null)}
      >
        {data.map((datum, i) => (
          <button
            key={datum.key}
            type="button"
            aria-label={`${datum.label}: ${formatValue(datum.value)}`}
            aria-pressed={i === index}
            onClick={() => setSelected(i === selected ? null : i)}
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") setSelected(i);
            }}
            className="flex h-full min-w-0 flex-1 items-end"
          >
            <span
              className={cn(
                "min-h-0.5 w-full rounded-t-sm transition-colors motion-reduce:transition-none",
                i === index
                  ? "bg-primary dark:bg-sidebar-primary"
                  : "bg-foreground/20",
              )}
              style={{ height: `${(datum.value / max) * 100}%` }}
            />
          </button>
        ))}
      </div>
      <div className="flex justify-between gap-2 text-2xs text-foreground/70">
        <span>{data[0].label}</span>
        <span>{endLabel ?? data[data.length - 1].label}</span>
      </div>
    </figure>
  );
}
