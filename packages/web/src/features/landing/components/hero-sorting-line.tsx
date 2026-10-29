import { FoilOverlay } from "@/components/foil-overlay";
import { ViewfinderCorners } from "@/features/landing/components/viewfinder-corners";
import { DEMO_SCANNED_CARDS } from "@/features/landing/lib/demo-cards";
import { HeroScanReadout } from "@/features/landing/components/hero-scan-readout";
import { HeroSortLog } from "@/features/landing/components/hero-sort-log";
import {
  DEMO_BIN_DIAGRAM_MODULES,
  HERO_ARRIVAL_DELAY_MS,
  HERO_BIN_BASE_COUNTS,
  HERO_BIN_CAPACITY,
  HERO_QUEUE_PREVIEW,
  HERO_SORT_INTERVAL_MS,
} from "@/lib/constants/landing";
import { CATCH_ALL_BIN } from "@/lib/constants/scanner";
import { cn } from "@/lib/utils";
import { IconChevronRight } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { HeroStationLabelProps } from "@/lib/interfaces/landing";

function StationLabel({ step, label }: HeroStationLabelProps) {
  return (
    <p className="font-heading text-2xs font-medium tracking-widest text-foreground/70 uppercase">
      <span className="text-primary">{step}</span> / {label}
    </p>
  );
}

function StationArrow() {
  return (
    <div className="absolute top-1/2 -left-3 z-10 hidden size-6 -translate-y-1/2 items-center justify-center rounded-full border bg-background md:flex">
      <IconChevronRight className="size-3.5 text-foreground/70" />
    </div>
  );
}

export function HeroSortingLine() {
  const { t } = useTranslation("landing");
  const { t: tBins } = useTranslation("bins");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(
      () => setTick((n) => n + 1),
      HERO_SORT_INTERVAL_MS,
    );
    return () => window.clearInterval(id);
  }, []);

  const total = DEMO_SCANNED_CARDS.length;
  const current = DEMO_SCANNED_CARDS[tick % total];
  const queue = Array.from(
    { length: HERO_QUEUE_PREVIEW },
    (_, i) => DEMO_SCANNED_CARDS[(tick + 1 + i) % total],
  );
  const binCounts = useMemo(() => {
    const counts: Record<number, number> = { ...HERO_BIN_BASE_COUNTS };
    DEMO_SCANNED_CARDS.forEach((d, position) => {
      if (tick >= position) {
        counts[d.binNumber] += Math.floor((tick - position) / total) + 1;
      }
    });
    return counts;
  }, [tick, total]);

  const sortedCount = Object.values(binCounts).reduce((a, b) => a + b, 0);

  const renderBin = (binNumber: number) => {
    const active = binNumber === current.binNumber;
    const isCatchAll = binNumber === CATCH_ALL_BIN;
    const fillRatio = Math.min(1, binCounts[binNumber] / HERO_BIN_CAPACITY);
    return (
      <div
        key={binNumber}
        className={cn(
          "relative flex items-center justify-between gap-2 overflow-hidden rounded-md border px-2.5 py-2 transition-colors duration-300",
          active ? "border-primary bg-primary/10" : "bg-background",
          isCatchAll && "col-span-2",
        )}
      >
        <div className="min-w-0">
          <p
            className={cn(
              "font-heading text-xs font-semibold",
              active && "text-primary",
            )}
          >
            {tBins("binLabel", { number: binNumber })}
          </p>
          <p className="truncate text-2xs text-foreground/70">
            {isCatchAll
              ? tBins("catchAll")
              : t(`hero.binRules.${binNumber}`)}
          </p>
        </div>
        {active && (
          <img
            key={tick}
            src={current.card.image?.small || ""}
            alt=""
            style={{ animationDelay: `${HERO_ARRIVAL_DELAY_MS - 500}ms` }}
            className="pointer-events-none absolute top-1 right-10 aspect-5/7 w-5 rounded-sm object-cover opacity-0 ring-1 ring-primary animate-[hero-card-drop_700ms_ease-in_both] motion-reduce:hidden"
          />
        )}
        <span
          key={active ? tick : undefined}
          style={
            active ? { animationDelay: `${HERO_ARRIVAL_DELAY_MS}ms` } : undefined
          }
          className={cn(
            "font-heading text-sm font-semibold tabular-nums",
            active
              ? "text-primary animate-in fade-in zoom-in-75 duration-300 [animation-fill-mode:both] motion-reduce:animate-none"
              : "text-foreground/70",
          )}
        >
          {binCounts[binNumber]}
        </span>
        <span
          className="absolute bottom-0 left-0 h-0.5 bg-primary/50 transition-[width] duration-700"
          style={{ width: `${fillRatio * 100}%` }}
        />
      </div>
    );
  };

  return (
    <div>
      <div className="relative flex items-center justify-between gap-3 border-b px-4 py-2.5">
        <p className="flex items-center gap-2 font-heading text-2xs font-medium tracking-widest uppercase">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          {t("hero.liveSort")}
        </p>
        <p className="font-heading text-2xs tracking-wide text-foreground/70 tabular-nums">
          {t("hero.sortedCount", { count: sortedCount })}
        </p>
        <span
          key={tick}
          style={{ animationDuration: `${HERO_SORT_INTERVAL_MS}ms` }}
          className="absolute -bottom-px left-0 h-px w-full origin-left bg-primary animate-[wrapped-progress_linear_both] motion-reduce:hidden"
        />
      </div>

      <div className="grid divide-y md:grid-cols-[minmax(0,0.75fr)_minmax(0,1.15fr)_minmax(0,1.1fr)] md:divide-x md:divide-y-0">
        <div className="hidden flex-col gap-4 p-5 md:flex">
          <StationLabel step="01" label={t("hero.stations.hopper")} />
          <div className="relative mx-auto mt-2 h-48 w-28">
            {queue
              .map((d, i) => (
                <img
                  key={`${tick}-${i}`}
                  src={d.card.image?.small || ""}
                  alt=""
                  className={cn(
                    "absolute inset-x-0 top-0 aspect-5/7 w-full rounded-md object-cover shadow-sm ring-1 ring-border",
                    i === 0 &&
                      "animate-in fade-in slide-in-from-bottom-3 duration-500 motion-reduce:animate-none",
                  )}
                  style={{
                    transform: `translateY(${i * 14}px) scale(${1 - i * 0.06})`,
                    opacity: 1 - i * 0.25,
                    zIndex: HERO_QUEUE_PREVIEW - i,
                  }}
                />
              ))
              .reverse()}
          </div>
          <div className="mt-auto">
            <p className="text-2xs text-foreground/70">{t("hero.nextUp")}</p>
            <p className="truncate text-xs font-medium">{queue[0].card.name}</p>
          </div>
        </div>

        <div className="relative flex flex-col gap-4 p-5">
          <StationArrow />
          <StationLabel step="02" label={t("hero.stations.camera")} />
          <div className="flex items-center gap-5">
            <div className="relative w-32 shrink-0 p-2 sm:w-36">
              <ViewfinderCorners
                key={`corners-${tick}`}
                className="animate-in zoom-in-110 fade-in duration-500 [animation-delay:250ms] [animation-fill-mode:both] motion-reduce:animate-none"
              />
              <div
                key={tick}
                className="relative aspect-5/7 overflow-hidden rounded-md animate-in fade-in slide-in-from-left-4 duration-500 motion-reduce:animate-none"
              >
                <img
                  src={current.card.image?.normal || ""}
                  alt={current.card.name}
                  className="size-full object-cover"
                />
                {current.isFoil && <FoilOverlay />}
                <div className="absolute inset-x-0 top-0 z-20 h-0.5 bg-primary shadow-[0_0_12px_2px] shadow-primary/70 animate-[hero-scan-sweep_1.1s_ease-in-out_both] motion-reduce:hidden" />
              </div>
            </div>
            <HeroScanReadout key={tick} scannedCard={current} />
          </div>
        </div>

        <div className="relative flex flex-col gap-4 p-5">
          <StationArrow />
          <StationLabel step="03" label={t("hero.stations.bins")} />
          <div className="grid grid-cols-2 gap-1.5">
            {DEMO_BIN_DIAGRAM_MODULES.flatMap((m) => [m.left, m.right]).map(
              renderBin,
            )}
            {renderBin(CATCH_ALL_BIN)}
          </div>
        </div>
      </div>

      <HeroSortLog tick={tick} sortedCount={sortedCount} />
    </div>
  );
}
