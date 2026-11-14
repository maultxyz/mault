import type { StatsHighlightsProps } from "@/lib/interfaces/stats";
import { useTranslation } from "react-i18next";

export function StatsHighlights({ insights }: StatsHighlightsProps) {
  const { t } = useTranslation("stats");
  if (insights.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-heading text-sm font-semibold text-foreground">{t("highlights.title")}</h2>
      <ul className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-5">
        {insights.map((insight) => {
          const InsightIcon = insight.icon;
          return (
            <li key={insight.key} className="flex flex-col gap-3 rounded-card bg-card p-4 md:gap-1.5 md:p-2.5">
              <span
                aria-hidden
                className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-sidebar-primary"
              >
                <InsightIcon className="size-4" />
              </span>
              <div className="mt-auto flex flex-col gap-0.5">
                <p className="text-sm font-semibold text-foreground">{insight.title}</p>
                <p className="text-xs text-foreground/70">{insight.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
