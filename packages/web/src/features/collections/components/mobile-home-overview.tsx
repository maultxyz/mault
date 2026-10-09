import { FoilOverlay } from "@/components/foil-overlay";
import { Skeleton } from "@/components/ui/skeleton";
import { orgOverviewQueryOptions } from "@/features/collections/api/org-overview";
import { usePriceSource } from "@/hooks/use-price-source";
import {
  MOBILE_SECTION_CLASS,
  MOBILE_SECTION_LABEL_CLASS,
} from "@/lib/constants/nav";
import type {
  HomeCardStripProps,
  HomeStatTileProps,
  MobileHomeHeroProps,
  MobileHomeOverviewProps,
  ScanActivityChartProps,
} from "@/lib/interfaces/home";
import { STATS_PATH } from "@/lib/constants/stats";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function HomeStatTile({ label, value }: HomeStatTileProps) {
  return (
    <div className="min-w-0 rounded-lg bg-muted px-3 py-2.5">
      <p className="truncate text-lg leading-tight font-semibold text-foreground tabular-nums">
        {value}
      </p>
      <p className="truncate text-2xs text-foreground/70">{label}</p>
    </div>
  );
}

function ScanActivityChart({ days }: ScanActivityChartProps) {
  const { t } = useTranslation("scanner");
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((day) => day.count));
  const index = selected ?? days.length - 1;
  const current = days[index];

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-xs text-foreground tabular-nums">
        {t("home.activityPoint", {
          date: formatDay(current.date),
          count: current.count,
        })}
      </figcaption>
      <div
        role="group"
        aria-label={t("home.activityLabel")}
        className="flex h-24 items-end gap-0.5 border-b"
      >
        {days.map((day, i) => (
          <button
            key={day.date}
            type="button"
            aria-label={t("home.activityPoint", {
              date: formatDay(day.date),
              count: day.count,
            })}
            aria-pressed={i === index}
            onClick={() => setSelected(i === selected ? null : i)}
            className="flex h-full flex-1 items-end"
          >
            <span
              className={cn(
                "min-h-0.5 w-full rounded-t-sm transition-colors",
                i === index
                  ? "bg-primary dark:bg-sidebar-primary"
                  : "bg-foreground/20",
              )}
              style={{ height: `${(day.count / max) * 100}%` }}
            />
          </button>
        ))}
      </div>
      <div className="flex justify-between text-2xs text-foreground/70">
        <span>{formatDay(days[0].date)}</span>
        <span>{t("home.today")}</span>
      </div>
    </figure>
  );
}

function HomeCardStrip({ title, cards }: HomeCardStripProps) {
  const { format } = usePriceSource();
  if (cards.length === 0) return null;

  return (
    <section className={MOBILE_SECTION_CLASS}>
      <h2 className={MOBILE_SECTION_LABEL_CLASS}>{title}</h2>
      <div className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pt-1 pb-1">
        {cards.map((entry) => (
          <Link
            key={entry.scanId}
            to={`/app/monitor/${entry.collectionGuid}`}
            className="flex w-24 shrink-0 snap-start flex-col gap-1.5 transition-transform active:scale-[0.97] motion-reduce:active:scale-100"
          >
            <div className="relative aspect-[2.5/3.5] w-full overflow-hidden rounded-lg bg-muted shadow-sm shadow-black/10 ring-1 ring-foreground/10">
              <img
                src={entry.card.image?.normal || entry.card.image?.small || ""}
                alt={entry.card.name}
                loading="lazy"
                draggable={false}
                className="h-full w-full object-cover"
              />
              {entry.isFoil && <FoilOverlay />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">
                {entry.card.name}
              </p>
              <p className="truncate text-xs text-foreground/70 tabular-nums">
                {entry.price != null
                  ? format(entry.price)
                  : entry.collectionName}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function MobileHomeHero({ orgId }: MobileHomeHeroProps) {
  const { t } = useTranslation("scanner");
  const { format } = usePriceSource();
  const { data } = useQuery(orgOverviewQueryOptions(orgId));

  return (
    <div className="flex flex-col">
      <p className="text-2xs font-medium uppercase tracking-wide text-primary-foreground/80">
        {t("home.totalValue")}
      </p>
      {data ? (
        <p className="truncate font-heading text-3xl leading-tight font-semibold tabular-nums">
          {format(data.totalValue)}
        </p>
      ) : (
        <Skeleton className="my-1 h-8 w-32 bg-primary-foreground/20" />
      )}
      <p className="text-xs text-primary-foreground/80 tabular-nums">
        {data
          ? [
              t("cardCount", { count: data.cardCount }),
              t("home.collectionCount", { count: data.collectionCount }),
            ].join(" · ")
          : " "}
      </p>
    </div>
  );
}

export function MobileHomeOverview({ orgId }: MobileHomeOverviewProps) {
  const { t } = useTranslation("scanner");
  const { data, isLoading } = useQuery(orgOverviewQueryOptions(orgId));

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-2">
        <HomeStatTile
          label={t("home.scannedToday")}
          value={data.scansToday.toLocaleString()}
        />
        <HomeStatTile
          label={t("home.thisWeek")}
          value={data.scansThisWeek.toLocaleString()}
        />
        <HomeStatTile
          label={t("home.collections")}
          value={data.collectionCount.toLocaleString()}
        />
      </div>

      {data.scansByDay.length > 1 && (
        <section className={MOBILE_SECTION_CLASS}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className={MOBILE_SECTION_LABEL_CLASS}>
              {t("home.activityTitle")}
            </h2>
            <Link
              to={STATS_PATH}
              className="text-xs font-medium text-primary dark:text-sidebar-primary"
            >
              {t("home.seeAllStats")}
            </Link>
          </div>
          <ScanActivityChart days={data.scansByDay} />
        </section>
      )}

      <HomeCardStrip title={t("home.mostValuable")} cards={data.topCards} />
      <HomeCardStrip
        title={t("home.recentlyScanned")}
        cards={data.recentCards}
      />
    </div>
  );
}
