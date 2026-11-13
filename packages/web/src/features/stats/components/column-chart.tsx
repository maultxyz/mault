import type { ColumnChartProps } from "@/lib/interfaces/stats";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function ColumnChart({
  data,
  formatValue,
  formatColumnValue,
  ariaLabel,
  endLabel,
  labelEachColumn = false,
}: ColumnChartProps) {
  const [selected, setSelected] = useState<number | null>(null);
  if (data.length === 0) return null;

  const max = Math.max(...data.map((datum) => datum.value), 0) || 1;
  const defaultIndex = labelEachColumn
    ? data.findIndex((datum) => datum.value === max)
    : data.length - 1;
  const index = Math.max(0, Math.min(selected ?? defaultIndex, data.length - 1));
  const current = data[index];

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-xs text-foreground tabular-nums">
        <span className="text-foreground/70">{current.label}: </span>
        <span className="font-semibold">{formatValue(current.value)}</span>
        {current.detail && <span className="text-foreground/70"> · {current.detail}</span>}
      </figcaption>
      <div
        role="group"
        aria-label={ariaLabel}
        className={cn(
          "flex h-28 items-end border-b md:h-28",
          labelEachColumn ? "gap-3" : "gap-0.5",
        )}
        onPointerLeave={() => setSelected(null)}
      >
        {data.map((datum, i) => (
          <button
            key={datum.key}
            type="button"
            aria-label={[`${datum.label}: ${formatValue(datum.value)}`, datum.detail].filter(Boolean).join(", ")}
            aria-pressed={i === index}
            onClick={() => setSelected(i === selected ? null : i)}
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") setSelected(i);
            }}
            className="flex h-full min-w-0 flex-1 flex-col items-stretch justify-end gap-1"
          >
            {formatColumnValue && (
              <span
                aria-hidden
                className={cn(
                  "truncate text-center text-2xs tabular-nums",
                  i === index ? "font-semibold text-foreground" : "text-foreground/70",
                )}
              >
                {formatColumnValue(datum.value)}
              </span>
            )}
            <span
              className={cn(
                "min-h-0.5 w-full rounded-t-sm transition-colors motion-reduce:transition-none",
                i === index
                  ? "bg-primary dark:bg-sidebar-primary"
                  : "bg-primary/15 dark:bg-primary/25",
              )}
              style={{ height: `${(datum.value / max) * (formatColumnValue ? 82 : 100)}%` }}
            />
          </button>
        ))}
      </div>
      {labelEachColumn ? (
        <div aria-hidden className="flex gap-3 text-2xs text-foreground/70">
          {data.map((datum, i) => (
            <span
              key={datum.key}
              className={cn("min-w-0 flex-1 text-center", i === index && "font-semibold text-foreground")}
            >
              {datum.label}
            </span>
          ))}
        </div>
      ) : (
        <div className="flex justify-between gap-2 text-2xs text-foreground/70">
          <span>{data[0].label}</span>
          <span>{endLabel ?? data[data.length - 1].label}</span>
        </div>
      )}
    </figure>
  );
}
