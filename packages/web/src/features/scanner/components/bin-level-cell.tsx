import { binLevelStatus } from "@/features/scanner/lib/bin-levels";
import type { BinLevelCellProps } from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import {
  IconAlertOctagon,
  IconAlertTriangle,
  IconBucketDroplet,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function BinLevelCell({
  level,
  isCatchAll,
  flashKey,
  onEmpty,
  className,
}: BinLevelCellProps) {
  const { t } = useTranslation("scanner");
  const status = binLevelStatus(level);
  const hasCapacity = level.capacity != null;

  return (
    <button
      type="button"
      onClick={() => onEmpty(level.binNumber)}
      aria-label={t("binStatusMeter.emptyAction", { bin: level.binNumber })}
      className={cn(
        "group/bin relative flex min-w-0 cursor-pointer items-center gap-1 overflow-hidden px-2 py-1 text-left transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
        className,
      )}
      title={
        hasCapacity
          ? t("binStatusMeter.cellTitle", {
              bin: level.binNumber,
              percent: level.percent,
            })
          : undefined
      }
    >
      {hasCapacity && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 transition-[width] duration-500",
            status === "full"
              ? "bg-destructive/25"
              : status === "warning"
                ? "bg-warning/30"
                : "bg-primary/15",
          )}
          style={{
            width: `${Math.max(level.percent, level.count > 0 ? 3 : 0)}%`,
          }}
        />
      )}
      {flashKey != null && (
        <span
          key={flashKey}
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-primary/25 animate-out fade-out-0 duration-1000 fill-mode-forwards motion-reduce:hidden"
        />
      )}
      <span className="relative truncate text-2xs font-medium uppercase tracking-wide text-foreground/70">
        {t("binStatusMeter.binLabel", { bin: level.binNumber })}
        {isCatchAll && ` · ${t("binStatusMeter.catchAll")}`}
      </span>
      {status === "full" && (
        <IconAlertOctagon
          className="relative size-3.5 shrink-0 text-destructive"
          aria-label={t("binStatusMeter.full")}
        />
      )}
      {status === "warning" && (
        <IconAlertTriangle
          className="relative size-3.5 shrink-0 text-warning-foreground"
          aria-label={t("binStatusMeter.nearlyFull")}
        />
      )}
      <span className="relative ml-auto shrink-0 text-xs font-semibold tabular-nums">
        {level.count}
        {hasCapacity && (
          <span className="font-normal text-foreground/70">
            /{level.capacity}
          </span>
        )}
      </span>
      <IconBucketDroplet
        aria-hidden
        className="relative -mr-0.5 size-3.5 shrink-0 text-foreground/70 opacity-0 transition-opacity group-hover/bin:opacity-100 group-focus-visible/bin:opacity-100 pointer-coarse:opacity-100"
      />
    </button>
  );
}
