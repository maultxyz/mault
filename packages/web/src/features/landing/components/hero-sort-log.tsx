import { DEMO_SCANNED_CARDS } from "@/features/landing/lib/demo-cards";
import {
  HERO_ARRIVAL_DELAY_MS,
  HERO_LOG_ENTRY_COUNT,
} from "@/lib/constants/landing";
import type { HeroSortLogProps } from "@/lib/interfaces/landing";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function HeroSortLog({ tick, sortedCount }: HeroSortLogProps) {
  const { t } = useTranslation("landing");
  const { t: tBins } = useTranslation("bins");
  const [arrivedTick, setArrivedTick] = useState(-1);
  const hasCurrentCardArrived = arrivedTick === tick;

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setArrivedTick(tick),
      HERO_ARRIVAL_DELAY_MS,
    );
    return () => window.clearTimeout(timeoutId);
  }, [tick]);

  const total = DEMO_SCANNED_CARDS.length;
  const newestAge = hasCurrentCardArrived ? 0 : 1;
  const entries = Array.from({ length: HERO_LOG_ENTRY_COUNT }, (_, index) => {
    const age = newestAge + index;
    return {
      age,
      sortNumber: sortedCount - age,
      scannedCard: DEMO_SCANNED_CARDS[(((tick - age) % total) + total) % total],
    };
  });

  return (
    <div className="flex items-center gap-4 overflow-hidden border-t px-4 py-2.5 font-heading text-2xs tabular-nums">
      <span className="shrink-0 font-medium tracking-widest text-foreground/70 uppercase">
        {t("hero.recent")}
      </span>
      <ol className="flex min-w-0 flex-1 items-center gap-5 overflow-hidden">
        {entries.map(({ age, sortNumber, scannedCard }, index) => (
          <li
            key={sortNumber}
            className={cn(
              "flex min-w-0 items-center gap-2 whitespace-nowrap md:shrink-0",
              index === 0
                ? "animate-in fade-in slide-in-from-left-4 duration-300 motion-reduce:animate-none"
                : "text-foreground/70 max-md:hidden",
            )}
          >
            <span className="text-foreground/70">
              #{String(sortNumber).padStart(4, "0")}
            </span>
            <span className="max-w-36 truncate font-sans text-xs font-medium">
              {scannedCard.card.name}
            </span>
            <span className={cn("shrink-0", age === 0 && "text-primary")}>
              → {tBins("binLabel", { number: scannedCard.binNumber })}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
