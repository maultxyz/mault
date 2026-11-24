import { CARD_PRICE_HISTORY_SPARKLINE } from "@/lib/constants/cards";
import type { PriceHistorySparklineProps } from "@/lib/interfaces/cards";
import { indexAtX, sparklinePaths, sparklinePoints } from "@magic-vault/shared";
import { useId, type KeyboardEvent, type PointerEvent } from "react";

export function PriceHistorySparkline({
  values,
  selectedIndex,
  onSelectedIndexChange,
  ariaLabel,
  ariaValueText,
}: PriceHistorySparklineProps) {
  const fillId = useId();
  const { width, height, verticalPadding, strokeWidth } = CARD_PRICE_HISTORY_SPARKLINE;
  const plotHeight = height - verticalPadding * 2;
  const paths = sparklinePaths(values, width, plotHeight, verticalPadding);
  const points = sparklinePoints(values, width, plotHeight, verticalPadding);
  const lastIndex = values.length - 1;
  const selectedPoint = points[selectedIndex];

  const selectAtPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onSelectedIndexChange(indexAtX(event.clientX - rect.left, rect.width, values.length));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next =
      event.key === "ArrowLeft" || event.key === "ArrowDown"
        ? selectedIndex - 1
        : event.key === "ArrowRight" || event.key === "ArrowUp"
          ? selectedIndex + 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? lastIndex
              : null;
    if (next === null) return;
    event.preventDefault();
    onSelectedIndexChange(Math.max(0, Math.min(lastIndex, next)));
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={lastIndex}
      aria-valuenow={selectedIndex}
      aria-valuetext={ariaValueText}
      onKeyDown={onKeyDown}
      onBlur={() => onSelectedIndexChange(null)}
      onPointerDown={selectAtPointer}
      onPointerMove={selectAtPointer}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") onSelectedIndexChange(null);
      }}
      className="relative shrink-0 touch-pan-y rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      style={{ width, height }}
    >
      <svg aria-hidden width={width} height={height} className="absolute inset-0 overflow-visible text-primary">
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity={0.22} />
            <stop offset="1" stopColor="currentColor" stopOpacity={0} />
          </linearGradient>
        </defs>
        {paths && (
          <>
            <path d={`${paths.line} L ${width} ${height} L 0 ${height} Z`} fill={`url(#${fillId})`} />
            <path
              d={paths.line}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
        {selectedPoint && (
          <circle
            cx={selectedPoint.x}
            cy={selectedPoint.y}
            r={3}
            fill="currentColor"
            className="stroke-card"
            strokeWidth={1.5}
          />
        )}
      </svg>
    </div>
  );
}
