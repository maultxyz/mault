import {
  DEMO_SCANNED_CARDS,
  toScannedCards,
} from "@/app/routes/landing/demo-cards";
import { computeStats } from "@/features/scanner/lib/compute-stats";
import { useTranslation } from "react-i18next";

export function DemoStatsBreakdown() {
  const { t } = useTranslation("scanner");
  const stats = computeStats(toScannedCards(DEMO_SCANNED_CARDS));
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-lg border border-input p-2 bg-background">
        <p className="mb-1.5 text-[10px] font-medium tracking-wide text-foreground/70 uppercase">
          {t("scanStats.byRarity")}
        </p>
        <div className="flex flex-col gap-1">
          {stats.rarities.map((r) => (
            <div
              key={r.key}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: `var(--${r.key})` }}
                />
                <span>{r.label}</span>
              </div>
              <span className="text-foreground/70">{r.count}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-input p-2 bg-background">
        <p className="mb-1.5 text-[10px] font-medium tracking-wide text-foreground/70 uppercase">
          {t("scanStats.byColor")}
        </p>
        <div className="flex flex-col gap-1">
          {stats.colors.map((c) => (
            <div
              key={c.key}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="size-2.5 rounded-full border border-border"
                  style={{ backgroundColor: c.bg }}
                />
                <span>{c.label}</span>
              </div>
              <span className="text-foreground/70">{c.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
