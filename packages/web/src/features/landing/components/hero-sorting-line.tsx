import { FoilOverlay } from "@/components/foil-overlay";
import { DEMO_SCANNED_CARDS } from "@/features/landing/lib/demo-cards";
import {
  DEMO_BIN_DIAGRAM_MODULES,
  HERO_BIN_BASE_COUNTS,
  HERO_QUEUE_PREVIEW,
  HERO_SORT_INTERVAL_MS,
} from "@/lib/constants/landing";
import { CATCH_ALL_BIN } from "@/lib/constants/scanner";
import { formatUsd } from "@/lib/format";
import { cn, matchPercent } from "@/lib/utils";
import { IconChevronRight, IconSparkles } from "@tabler/icons-react";
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
  const price =
    (current.isFoil ? current.card.priceFoil : current.card.price) ??
    current.card.price;

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
    return (
      <div
        key={binNumber}
        className={cn(
          "flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 transition-colors duration-300",
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
        <span
          key={active ? tick : undefined}
          className={cn(
            "font-heading text-sm font-semibold tabular-nums",
            active
              ? "text-primary animate-in fade-in zoom-in-75 duration-300 motion-reduce:animate-none"
              : "text-foreground/70",
          )}
        >
          {binCounts[binNumber]}
        </span>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
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
                  className="absolute inset-x-0 top-0 aspect-5/7 w-full rounded-md object-cover shadow-sm ring-1 ring-foreground/10"
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
              <span className="absolute top-0 left-0 size-4 border-t-2 border-l-2 border-primary" />
              <span className="absolute top-0 right-0 size-4 border-t-2 border-r-2 border-primary" />
              <span className="absolute bottom-0 left-0 size-4 border-b-2 border-l-2 border-primary" />
              <span className="absolute right-0 bottom-0 size-4 border-r-2 border-b-2 border-primary" />
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
            <div
              key={tick}
              className="flex min-w-0 flex-col gap-2.5 animate-in fade-in duration-500 [animation-delay:600ms] [animation-fill-mode:both] motion-reduce:animate-none"
            >
              <div>
                <p className="text-sm font-semibold leading-tight text-balance">
                  {current.card.name}
                </p>
                <p className="truncate text-2xs text-foreground/70">
                  {current.card.setName} #{current.card.collectorNumber}
                </p>
              </div>
              <div className="flex flex-col gap-1 font-heading text-xs tabular-nums">
                <span>
                  <span className="text-primary">
                    {matchPercent(current.card).toFixed(1)}%
                  </span>{" "}
                  <span className="text-foreground/70">{t("hero.match")}</span>
                </span>
                {price != null && <span>{formatUsd(price)}</span>}
                {current.isFoil && (
                  <span className="flex items-center gap-1 text-foreground/70">
                    <IconSparkles className="size-3" />
                    {t("hero.foil")}
                  </span>
                )}
              </div>
            </div>
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
    </div>
  );
}
