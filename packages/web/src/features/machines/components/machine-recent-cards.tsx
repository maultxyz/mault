import { CardImage } from "@/components/card-image";
import { MissingPrice } from "@/components/missing-price";
import { useSessionMonitor } from "@/features/scanner/api/use-session-monitor";
import { usePriceSource } from "@/hooks/use-price-source";
import { monitorCollectionPath } from "@/lib/constants/collections";
import {
  MACHINE_RECENT_CARD_WIDTH_CLASS,
  MACHINE_RECENT_CARDS_COUNT,
} from "@/lib/constants/machines";
import { MONITOR_OPEN_CARD_PARAM } from "@/lib/constants/scanner";
import type { MachinePanelProps } from "@/lib/interfaces/machines";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function MachineRecentCards({ machine }: MachinePanelProps) {
  const { t } = useTranslation("machines");
  const { recentCards } = useSessionMonitor(machine.collectionGuid ?? undefined);
  const { priceOf, format } = usePriceSource();
  const cards = machine.collectionGuid ? recentCards.slice(0, MACHINE_RECENT_CARDS_COUNT) : [];

  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-heading text-sm font-semibold text-foreground">{t("recent.title")}</h3>
      {cards.length === 0 ? (
        <p className="rounded-lg bg-card px-3 py-2 text-sm text-foreground/70">
          {machine.lastCard?.name
            ? t("recent.lastCard", { name: machine.lastCard.name })
            : t("recent.empty")}
        </p>
      ) : (
        <ol className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
          {cards.map((entry) => {
            const price = priceOf(
              entry.card,
              { isFoil: entry.isFoil, foilType: entry.foilType },
              entry.condition,
            );
            return (
              <li
                key={entry.scanId}
                className={cn("shrink-0 snap-start animate-in fade-in-0 slide-in-from-left-4 motion-reduce:animate-none", MACHINE_RECENT_CARD_WIDTH_CLASS)}
              >
                <Link
                  to={`${monitorCollectionPath(machine.collectionGuid!)}?${MONITOR_OPEN_CARD_PARAM}=${entry.scanId}`}
                  aria-label={t("recent.open", { name: entry.card.name })}
                  className="flex h-full gap-3 rounded-card bg-card p-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="relative aspect-[2.5/3.5] w-16 shrink-0 overflow-hidden rounded-sm bg-muted">
                    <CardImage src={entry.card.image?.small} alt="" className="absolute inset-0" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold text-foreground">{entry.card.name}</span>
                    <span className="truncate text-xs text-foreground/70">{entry.card.setName}</span>
                    {entry.binNumber != null && (
                      <span className="text-xs text-foreground/70">
                        {t("recent.bin", { number: entry.binNumber })}
                      </span>
                    )}
                    {entry.lowConfidenceMatch && (
                      <span className="text-xs text-warning-foreground">{t("recent.lowConfidence")}</span>
                    )}
                    <span className="mt-auto text-sm font-semibold text-foreground">
                      {price != null ? format(price) : <MissingPrice />}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
