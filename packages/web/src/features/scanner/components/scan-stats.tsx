import { ScrollArea } from "@/components/ui/scroll-area";
import { applyCardFilters } from "@/features/cards/api/use-card-filter-sort";
import { useCardFilters } from "@/features/cards/api/use-card-filters";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { computeDisplayStats } from "@/features/scanner/lib/compute-stats";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export function formatUsd(value: number): string {
  // Non-breaking space keeps "USD" from wrapping onto its own line in
  // tight layouts (card grid badges, stat tiles).
  return `$${value.toFixed(2)} USD`;
}

export function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function ScanStats() {
  const { t } = useTranslation("scanner");
  const [expandedSets, setExpandedSets] = useState(false);
  const { cards, elapsedMs, isTimerActive } = useScannedCards();
  const { filters, toggleRarity, toggleColor, toggleSet } = useCardFilters();

  const visibleCards = useMemo(
    () => applyCardFilters(cards, filters),
    [cards, filters],
  );
  const stats = useMemo(
    () => computeDisplayStats(cards, visibleCards),
    [cards, visibleCards],
  );

  if (!stats) {
    return (
      <div
        data-tour="scan-stats"
        className="rounded-lg bg-input/20 dark:bg-input/30 border border-input text-xs font-semibold text-muted-foreground p-2"
      >
        {t("scanStats.emptyState")}
      </div>
    );
  }

  const visibleSets = expandedSets ? stats.sets : stats.sets.slice(0, 5);

  const statCards: { label: string; value: string; indicator?: boolean }[] = [
    { label: t("scanStats.totalCards"), value: String(stats.totalCount) },
    { label: t("scanStats.unique"), value: String(stats.uniqueCount) },
  ];
  if (stats.hasPricing) {
    statCards.push(
      { label: t("scanStats.totalValue"), value: formatUsd(stats.totalValue) },
      { label: t("scanStats.avgValue"), value: formatUsd(stats.avgValue) },
    );
  }
  statCards.push(
    {
      label: t("scanStats.sessionTime"),
      value: formatElapsed(elapsedMs),
      indicator: isTimerActive,
    },
    {
      label: t("scanStats.cardsPerHour"),
      value:
        elapsedMs > 0
          ? String(Math.round((cards.length / elapsedMs) * 3_600_000))
          : "-",
    },
  );

  return (
    <ScrollArea className="min-h-0 rounded-lg" data-tour="scan-stats">
      <div className="flex flex-col gap-2 pr-3 text-sm">
        <div className="rounded-lg bg-input/20 dark:bg-input/30 border border-input">
          <div className="grid grid-cols-2">
            {statCards.map((card, i) => (
              <StatCard
                key={card.label}
                label={card.label}
                value={card.value}
                indicator={card.indicator}
                className={cn(
                  i % 2 === 0 && "border-r",
                  i < statCards.length - 2 && "border-b",
                  "border-input",
                )}
              />
            ))}
          </div>
          {stats.mostValuable && (
            <div className="p-2 border-t border-input">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                {t("scanStats.mostValuable")}
              </p>
              <div className="flex flex-row justify-between items-center">
                <p className="text-xs font-semibold truncate">
                  {stats.mostValuable.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatUsd(stats.mostValuable.price)}
                </p>
              </div>
            </div>
          )}
        </div>
        {stats.rarities.length > 0 && (
          <div className="rounded-lg bg-input/20 dark:bg-input/30 border border-input p-2">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              {t("scanStats.byRarity")}
            </p>
            <div className="flex flex-col gap-1">
              {stats.rarities.map((r) => {
                const active = filters.rarities.includes(r.key);
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => toggleRarity(r.key)}
                    className={cn(
                      "flex items-center justify-between text-xs rounded px-1 -mx-1 py-0.5 cursor-pointer transition-colors",
                      active ? "bg-primary/15" : "hover:bg-muted",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <div
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: `var(--${r.key})` }}
                      />
                      <span className={active ? "font-medium" : undefined}>
                        {r.label}
                      </span>
                    </div>
                    <span className="text-muted-foreground">{r.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {stats.colors.length > 0 && (
          <div className="rounded-lg bg-input/20 dark:bg-input/30 border border-input p-2">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              {t("scanStats.byColor")}
            </p>
            <div className="flex flex-col gap-1">
              {stats.colors.map((c) => {
                const active = filters.colors.includes(c.key);
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => toggleColor(c.key)}
                    className={cn(
                      "flex items-center justify-between text-xs rounded px-1 -mx-1 py-0.5 cursor-pointer transition-colors",
                      active ? "bg-primary/15" : "hover:bg-muted",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <div
                        className="size-2.5 rounded-full border border-border"
                        style={{ backgroundColor: c.bg }}
                      />
                      <span className={active ? "font-medium" : undefined}>
                        {c.label}
                      </span>
                    </div>
                    <span className="text-muted-foreground">{c.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="rounded-lg bg-input/20 dark:bg-input/30 border border-input p-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            {t("scanStats.bySet")}
          </p>
          <div className="flex flex-col gap-1">
            {visibleSets.map((s) => {
              const active = filters.sets.includes(s.code);
              return (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => toggleSet(s.code)}
                  className={cn(
                    "flex items-center justify-between text-xs gap-2 rounded px-1 -mx-1 py-0.5 cursor-pointer transition-colors",
                    active ? "bg-primary/15" : "hover:bg-muted",
                  )}
                >
                  <span
                    className={cn("truncate", active && "font-medium")}
                    title={s.name}
                  >
                    {s.name}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-muted-foreground">{s.count}</span>
                    <span className="text-muted-foreground text-right">
                      {formatUsd(s.value)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          {stats.sets.length > 5 && (
            <button
              type="button"
              className="text-xs text-primary hover:underline mt-1"
              onClick={() => setExpandedSets((prev) => !prev)}
            >
              {expandedSets
                ? t("scanStats.showLess")
                : t("scanStats.showAllSets", { count: stats.sets.length })}
            </button>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

function StatCard({
  label,
  value,
  className,
  indicator,
}: {
  label: string;
  value: string;
  className?: string;
  indicator?: boolean;
}) {
  return (
    <div className={`p-2 ${className ?? ""}`}>
      <div className="flex items-center gap-1.5">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        {indicator !== undefined && (
          <span
            className={`size-1.5 rounded-full shrink-0 ${indicator ? "bg-green-500 animate-pulse" : "bg-muted-foreground/40"}`}
          />
        )}
      </div>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
