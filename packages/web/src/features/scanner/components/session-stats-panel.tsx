import { formatUsd } from "@/lib/format";
import type { ScanStats } from "@/features/scanner/lib/compute-stats";
import { useTranslation } from "react-i18next";

function StatCell({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`p-3 ${className ?? ""}`}>
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

interface SessionStatsPanelProps {
  stats: ScanStats | null;
  totalCards: number;
}

export function SessionStatsPanel({
  stats,
  totalCards,
}: SessionStatsPanelProps) {
  const { t } = useTranslation("scanner");
  return (
    <>
      <div className="rounded-lg border bg-input/20 dark:bg-input/30">
        <div className="grid grid-cols-2 divide-x divide-y divide-border">
          <div className="col-span-2 divide-y divide-border">
            <StatCell
              label={t("totalCards")}
              value={String(totalCards)}
            />
          </div>
          <StatCell
            label={t("unique")}
            value={stats ? String(stats.uniqueCount) : "-"}
            className={!stats?.hasPricing ? "col-span-2" : undefined}
          />
          {stats?.hasPricing && (
            <StatCell
              label={t("sessionStatsPanel.value")}
              value={formatUsd(stats.totalValue)}
            />
          )}
        </div>
        {stats?.mostValuable && (
          <div className="p-2 border-t border-input">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
              {t("mostValuable")}
            </p>
            <p className="text-xs font-semibold truncate">
              {stats.mostValuable.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatUsd(stats.mostValuable.price)}
            </p>
          </div>
        )}
      </div>

      {stats && stats.rarities.length > 0 && (
        <div className="rounded-lg border bg-input/20 dark:bg-input/30 p-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            {t("byRarity")}
          </p>
          <div className="flex flex-col gap-1">
            {stats.rarities.map((r) => (
              <div
                key={r.key}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-1.5">
                  <div
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: `var(--${r.key})` }}
                  />
                  <span>{r.label}</span>
                </div>
                <span className="text-muted-foreground">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
