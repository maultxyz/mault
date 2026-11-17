import { FoilOverlay } from "@/components/foil-overlay";
import { StatGroup } from "@/components/stat-group";
import { Skeleton } from "@/components/ui/skeleton";
import { orgOverviewQueryOptions } from "@/features/collections/api/org-overview";
import { usePriceSource } from "@/hooks/use-price-source";
import { MobileSection } from "@/components/mobile-section";
import {
  MOBILE_HERO_LABEL_CLASS,
  MOBILE_HERO_VALUE_CLASS,
} from "@/lib/constants/nav";
import type {
  HomeCardStripProps,
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

function ScanActivityChart({ days }: ScanActivityChartProps) {
  const { t } = useTranslation("scanner");
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((day) => day.count));
  const index = selected ?? days.length - 1;
  const current = days[index];

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm text-foreground tabular-nums">
        {t("home.activityPoint", {
          date: formatDay(current.date),
          count: current.count,
        })}
      </figcaption>
      <div
        role="group"
        aria-label={t("home.activityLabel")}
        className="flex h-28 items-end gap-1 border-b"
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
    <MobileSection title={title}>
      <div className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pt-1 pb-1">
        {cards.map((entry) => (
          <Link
            key={entry.scanId}
            to={`/app/monitor/${entry.collectionGuid}`}
            className="flex w-28 shrink-0 snap-start flex-col gap-1.5 transition-transform active:scale-[0.97] motion-reduce:active:scale-100"
          >
            <div className="relative aspect-[2.5/3.5] w-full overflow-hidden rounded-lg bg-muted ring-1 ring-border">
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
              <p className="truncate text-sm font-semibold text-foreground">
                {entry.card.name}
              </p>
              <p className="truncate text-sm text-foreground/70 tabular-nums">
                {entry.price != null
                  ? format(entry.price)
                  : entry.collectionName}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </MobileSection>
  );
}

export function MobileHomeHero({ orgId }: MobileHomeHeroProps) {
  const { t } = useTranslation("scanner");
  const { format } = usePriceSource();
  const { data } = useQuery(orgOverviewQueryOptions(orgId));

  return (
    <div className="flex flex-col gap-0.5">
      <p className={MOBILE_HERO_LABEL_CLASS}>{t("home.totalValue")}</p>
      {data ? (
        <p className={MOBILE_HERO_VALUE_CLASS}>{format(data.totalValue)}</p>
      ) : (
        <Skeleton className="my-1 h-10 w-44" />
      )}
      <p className="text-sm text-foreground/70 tabular-nums">
        {data
          ? [
              t("cardCount", { count: data.cardCount }),
              t("home.collectionCount", { count: data.collectionCount }),
            ].join(" · ")
          : " "}
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
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="flex flex-col gap-7">
      <StatGroup
        heading={t("home.statsHeading")}
        gridClassName="grid-cols-3"
        tiles={[
          {
            key: "scanned-today",
            label: t("home.scannedToday"),
            value: data.scansToday.toLocaleString(),
          },
          {
            key: "this-week",
            label: t("home.thisWeek"),
            value: data.scansThisWeek.toLocaleString(),
          },
          {
            key: "collections",
            label: t("home.collections"),
            value: data.collectionCount.toLocaleString(),
          },
        ]}
      />

      {data.scansByDay.length > 1 && (
        <MobileSection
          title={t("home.activityTitle")}
          action={
            <Link
              to={STATS_PATH}
              className="text-sm font-semibold text-primary dark:text-sidebar-primary"
            >
              {t("home.seeAllStats")}
            </Link>
          }
        >
          <ScanActivityChart days={data.scansByDay} />
        </MobileSection>
      )}

      <HomeCardStrip title={t("home.mostValuable")} cards={data.topCards} />
      <HomeCardStrip
        title={t("home.recentlyScanned")}
        cards={data.recentCards}
      />
    </div>
  );
}
