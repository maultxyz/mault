import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { intakeLotCardsQueryOptions } from "@/features/business/api/business";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { IntakeOfferEditor } from "@/features/business/components/intake-offer-editor";
import { usePriceSource } from "@/hooks/use-price-source";
import {
  SCANNER_BUY_RECENT_CARDS_COUNT,
  SCANNER_BUY_RECENT_CARDS_PAGE,
} from "@/lib/constants/business";
import type { ScannerBuyRecentCardsProps } from "@/lib/interfaces/business";
import { cn } from "@/lib/utils";
import { IconChevronDown } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

export function ScannerBuyRecentCards({ lot, editsOffers }: ScannerBuyRecentCardsProps) {
  const { t } = useTranslation("business");
  const { format } = usePriceSource();
  const { access } = useBusinessAccess();
  const [isExpanded, setIsExpanded] = useState(false);
  const listId = useId();
  const { data, isPending } = useQuery({
    ...intakeLotCardsQueryOptions(lot.guid, SCANNER_BUY_RECENT_CARDS_PAGE, true),
    enabled: isExpanded,
  });
  const cards = (data?.items ?? []).slice(0, SCANNER_BUY_RECENT_CARDS_COUNT);
  const showsMoney = access?.canViewCosts ?? false;
  const usesOffers = lot.sourceType !== "opened";

  return (
    <div data-tour="scanner-buy-recent" className="flex flex-col gap-1.5">
      <Button
        variant="ghost"
        className="-ml-2 self-start"
        aria-expanded={isExpanded}
        aria-controls={listId}
        onClick={() => setIsExpanded((previous) => !previous)}
      >
        <IconChevronDown
          className={cn(
            "transition-transform motion-reduce:transition-none",
            !isExpanded && "-rotate-90",
          )}
        />
        {t("scannerBuy.recentCards")}
      </Button>
      {isExpanded && (
        <div id={listId}>
          {isPending ? (
            <div className="flex flex-col gap-1">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-8 rounded-lg" />
              ))}
            </div>
          ) : cards.length === 0 ? (
            <p className="text-xs text-foreground/70">{t("scannerBuy.noRecentCards")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-lg bg-foreground/6">
              {cards.map((entry) => (
                <li
                  key={entry.scanId}
                  className="flex min-h-9 items-center gap-3 px-3 py-1"
                  title={entry.belowMinimum ? t("intake.belowMinimum.rowTitle") : undefined}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-sm font-medium",
                        entry.belowMinimum && "text-foreground/70 line-through",
                      )}
                    >
                      {entry.card.name}
                      {entry.belowMinimum && (
                        <span className="sr-only">{`, ${t("intake.belowMinimum.rowTitle")}`}</span>
                      )}
                    </p>
                    <p className="truncate text-2xs text-foreground/70">
                      {[
                        `${entry.card.set.toUpperCase()} ${entry.card.collectorNumber}`,
                        entry.condition,
                        ...(entry.isFoil ? [t("table.foil")] : []),
                      ].join(" · ")}
                    </p>
                  </div>
                  {showsMoney && (
                    <div className="flex shrink-0 items-center gap-3 tabular-nums">
                      <p className="text-right text-xs text-foreground/70">
                        <span className="sr-only">{`${t("table.market")}: `}</span>
                        {entry.marketPrice != null ? format(entry.marketPrice) : "-"}
                      </p>
                      {usesOffers &&
                        (editsOffers ? (
                          <IntakeOfferEditor card={entry} />
                        ) : (
                          <p className="text-right text-sm font-medium">
                            <span className="sr-only">{`${t("table.offer")}: `}</span>
                            {entry.offer != null ? format(entry.offer) : "-"}
                          </p>
                        ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
