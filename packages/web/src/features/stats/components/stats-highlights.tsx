import { IconBadge } from "@/components/icon-badge";
import { STATS_HIGHLIGHT_TILE_CLASS } from "@/lib/constants/stats";
import type { StatsHighlightsProps } from "@/lib/interfaces/stats";
import { cn } from "@/lib/utils";
import { IconChevronRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function StatsHighlights({ insights }: StatsHighlightsProps) {
  const { t } = useTranslation("stats");
  if (insights.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-heading text-base font-semibold text-foreground md:text-sm">{t("highlights.title")}</h2>
      <ul className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-5">
        {insights.map((insight) => {
          const InsightIcon = insight.icon;
          const content = (
            <>
              <span className="flex items-center justify-between gap-2">
                <IconBadge aria-hidden>
                  <InsightIcon className="size-4" />
                </IconBadge>
                {insight.to && <IconChevronRight aria-hidden className="size-4 shrink-0 text-foreground/70" />}
              </span>
              <span className="mt-auto flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-foreground">{insight.title}</span>
                <span className="text-xs text-foreground/70">{insight.detail}</span>
              </span>
            </>
          );
          return (
            <li key={insight.key} className="flex">
              {insight.to ? (
                <Link
                  to={insight.to}
                  className={cn(
                    STATS_HIGHLIGHT_TILE_CLASS,
                    "transition-colors hover:bg-foreground/6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  )}
                >
                  {content}
                </Link>
              ) : (
                <div className={STATS_HIGHLIGHT_TILE_CLASS}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
