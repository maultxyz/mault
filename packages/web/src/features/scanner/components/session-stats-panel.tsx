import { usePriceSource } from "@/hooks/use-price-source";
import { useTranslation } from "react-i18next";
import type { SessionStatsPanelProps } from "@/lib/interfaces/scanner";
import { StatCell } from "@/components/stat-cell";
import { CompactCount, CompactPrice } from "@/components/compact-value";
import { cn } from "@/lib/utils";

export function SessionStatsPanel({
  stats,
  totalCards,
  isBordered = false,
}: SessionStatsPanelProps) {
  const { t } = useTranslation("scanner");
  const { format } = usePriceSource();
  return (
    <>
      <div className={cn("overflow-hidden rounded-card bg-card", isBordered && "border")}>
        <div className="grid grid-cols-2 divide-x divide-y divide-border">
          <div className="col-span-2 divide-y divide-border">
            <StatCell
              label={t("totalCards")}
              value={<CompactCount value={totalCards} />}
            />
          </div>
          <StatCell
            label={t("unique")}
            value={stats ? <CompactCount value={stats.uniqueCount} /> : "-"}
            className={!stats?.hasPricing ? "col-span-2" : undefined}
          />
          {stats?.hasPricing && (
            <StatCell
              label={t("sessionStatsPanel.value")}
              value={<CompactPrice value={stats.totalValue} />}
            />
          )}
        </div>
        {stats?.mostValuable && (
          <div className="border-t border-border p-3">
            <p className="mb-0.5 text-xs text-foreground/70">
              {t("mostValuable")}
            </p>
            <p className="text-xs font-semibold truncate">
              {stats.mostValuable.name}
            </p>
            <p className="text-xs text-foreground/70">
              {format(stats.mostValuable.price)}
            </p>
          </div>
        )}
      </div>

      {stats && stats.rarities.length > 0 && (
        <div className={cn("rounded-card bg-card p-3 md:p-2.5", isBordered && "border")}>
          <p className="mb-1.5 text-xs text-foreground/70">
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
                    style={{ backgroundColor: r.bg }}
                  />
                  <span>{r.label}</span>
                </div>
                <span className="text-foreground/70">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
