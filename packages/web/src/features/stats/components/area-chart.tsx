import { STATS_AREA_CHART, STATS_CHART_GRID_FRACTIONS } from "@/lib/constants/stats";
import type { AreaChartProps } from "@/lib/interfaces/stats";
import { indexAtX, niceCeiling, smoothLinePath } from "@magic-vault/shared";
import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";

export function AreaChart({ data, formatValue, formatAxisValue, ariaLabel, endLabel }: AreaChartProps) {
  const fillId = useId();
  const [selected, setSelected] = useState<number | null>(null);
  if (data.length === 0) return null;

  const { width, height, top, pillEdgePercent } = STATS_AREA_CHART;
  const lastIndex = data.length - 1;
  const index = Math.min(selected ?? lastIndex, lastIndex);
  const current = data[index];
  const yMax = niceCeiling(Math.max(...data.map((datum) => datum.value)));
  const xOf = (i: number) => (data.length === 1 ? width / 2 : (i / lastIndex) * width);
  const yOf = (value: number) => top + (height - top) - (value / yMax) * (height - top);
  const points = data.map((datum, i) => ({ x: xOf(i), y: yOf(datum.value) }));
  const line = points.length > 1 ? smoothLinePath(points, height) : null;
  const xPercent = (xOf(index) / width) * 100;
  const yPercent = (yOf(current.value) / height) * 100;

  const selectAtPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setSelected(indexAtX(event.clientX - rect.left, rect.width, data.length));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next =
      event.key === "ArrowLeft" || event.key === "ArrowDown"
        ? index - 1
        : event.key === "ArrowRight" || event.key === "ArrowUp"
          ? index + 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? lastIndex
              : null;
    if (next === null) return;
    event.preventDefault();
    setSelected(Math.max(0, Math.min(lastIndex, next)));
  };

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-xs text-foreground tabular-nums">
        <span className="text-foreground/70">{current.label}: </span>
        <span className="font-semibold">{formatValue(current.value)}</span>
      </figcaption>
      <div
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={lastIndex}
        aria-valuenow={index}
        aria-valuetext={`${current.label}: ${formatValue(current.value)}`}
        onKeyDown={onKeyDown}
        onPointerDown={selectAtPointer}
        onPointerMove={selectAtPointer}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") setSelected(null);
        }}
        className="relative h-44 touch-pan-y rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring md:h-36"
      >
        <svg
          aria-hidden
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible text-primary dark:text-sidebar-primary"
        >
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity={0.28} />
              <stop offset="1" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>
          {STATS_CHART_GRID_FRACTIONS.map((fraction) => (
            <line
              key={fraction}
              x1={0}
              x2={width}
              y1={yOf(yMax * fraction)}
              y2={yOf(yMax * fraction)}
              className="stroke-border"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {line && (
            <>
              <path d={`${line} L ${width} ${height} L 0 ${height} Z`} fill={`url(#${fillId})`} />
              <path
                d={line}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
          <line
            x1={xOf(index)}
            x2={xOf(index)}
            y1={yOf(current.value)}
            y2={height}
            stroke="currentColor"
            strokeOpacity={0.6}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {STATS_CHART_GRID_FRACTIONS.filter((fraction) => fraction > 0).map((fraction) => (
          <span
            key={fraction}
            aria-hidden
            className="absolute left-0 text-2xs text-foreground/70 tabular-nums"
            style={{ top: `calc(${(yOf(yMax * fraction) / height) * 100}% + 2px)` }}
          >
            {formatAxisValue(yMax * fraction)}
          </span>
        ))}
        <span
          aria-hidden
          className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-card dark:bg-sidebar-primary"
          style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
        />
        <span
          aria-hidden
          className="absolute -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-2xs font-semibold whitespace-nowrap text-primary-foreground tabular-nums"
          style={{
            left: `${Math.max(pillEdgePercent, Math.min(100 - pillEdgePercent, xPercent))}%`,
            top: `calc(${yPercent}% - 2rem)`,
          }}
        >
          {formatAxisValue(current.value)}
        </span>
      </div>
      <div className="flex justify-between gap-2 text-2xs text-foreground/70">
        <span>{data[0].label}</span>
        <span>{endLabel ?? data[lastIndex].label}</span>
      </div>
    </figure>
  );
}
