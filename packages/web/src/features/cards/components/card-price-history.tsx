import { LoadErrorCallout } from "@/components/load-error-callout";
import { Skeleton } from "@/components/ui/skeleton";
import { cardPriceHistoryQueryOptions } from "@/features/cards/api/card-price-history";
import { formatPriceHistoryDay } from "@/features/cards/lib/price-history-day";
import { PriceHistorySparkline } from "@/features/cards/components/price-history-sparkline";
import { usePriceSource } from "@/hooks/use-price-source";
import { CARD_PRICE_HISTORY_SPARKLINE } from "@/lib/constants/cards";
import type { CardPriceHistoryProps } from "@/lib/interfaces/cards";
import {
  cardPriceHistorySeries,
  CARD_PRICE_HISTORY_SHOWN_DAYS,
  PRICE_SOURCE_FIELDS,
  PRICE_SOURCE_STORE_NAME_KEYS,
  utcDayOf,
} from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function CardPriceHistory({ card, gameKey, lang, isFoil }: CardPriceHistoryProps) {
  const { t, i18n } = useTranslation("cards");
  const { t: tCommon } = useTranslation("common");
  const { source, format } = usePriceSource();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const fields = PRICE_SOURCE_FIELDS[source];
  const hasCurrentPrice = card[fields.price] != null || card[fields.priceFoil] != null;
  const history = useQuery({
    ...cardPriceHistoryQueryOptions({ gameKey, lang, cardId: card.id }),
    enabled: hasCurrentPrice,
  });
  if (!hasCurrentPrice) return null;

  const series = cardPriceHistorySeries(history.data?.points ?? [], {
    source,
    isFoil,
    rangeDays: CARD_PRICE_HISTORY_SHOWN_DAYS,
    today: utcDayOf(new Date()),
  });
  const lastIndex = series.days.length - 1;
  const shownDay = series.days[Math.min(selectedIndex ?? lastIndex, lastIndex)];
  const shownDayLabel = shownDay ? formatPriceHistoryDay(shownDay.day, i18n.language) : "";
  const title = t(series.isFoilPrice ? "priceHistory.titleFoil" : "priceHistory.title", {
    source: t(PRICE_SOURCE_STORE_NAME_KEYS[source]),
  });

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-xs font-medium text-foreground/70">{title}</h4>
      {history.isPending ? (
        <div role="status" aria-busy="true" className="flex items-center justify-between gap-3">
          <span className="sr-only">{tCommon("a11y.loading")}</span>
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3 w-16 rounded-sm" />
            <Skeleton className="h-5 w-20 rounded-sm" />
          </div>
          <Skeleton
            className="shrink-0 rounded-sm"
            style={{ width: CARD_PRICE_HISTORY_SPARKLINE.width, height: CARD_PRICE_HISTORY_SPARKLINE.height }}
          />
        </div>
      ) : history.isError ? (
        <LoadErrorCallout message={t("priceHistory.loadFailed")} onRetry={() => void history.refetch()} />
      ) : !shownDay ? (
        <p className="text-xs text-foreground/70">{t("priceHistory.empty")}</p>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <span className="text-xs text-foreground/70">{shownDayLabel}</span>
            <span className="text-base font-semibold tabular-nums">{format(shownDay.value)}</span>
          </div>
          {series.days.length < 2 ? (
            <p className="max-w-48 text-xs text-foreground/70">
              {t("priceHistory.unchangedSince", {
                date: formatPriceHistoryDay(series.currentPriceSinceDay ?? shownDay.day, i18n.language),
              })}
            </p>
          ) : (
            <PriceHistorySparkline
              values={series.days.map((day) => day.value)}
              selectedIndex={Math.min(selectedIndex ?? lastIndex, lastIndex)}
              onSelectedIndexChange={setSelectedIndex}
              ariaLabel={title}
              ariaValueText={`${shownDayLabel}: ${format(shownDay.value)}`}
            />
          )}
        </div>
      )}
    </div>
  );
}
