import type { TradeOfferPickProgressBarProps } from "@/lib/interfaces/trade-offers";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export function TradeOfferPickProgress({ pickedCount, totalCount }: TradeOfferPickProgressBarProps) {
  const { t } = useTranslation("common");
  const labelId = useId();
  const percentPicked = totalCount > 0 ? Math.round((pickedCount / totalCount) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <span
        id={labelId}
        role="status"
        className="shrink-0 text-xs font-medium text-foreground/70 tabular-nums"
      >
        {t("tradeOffers.pickList.progress", { picked: pickedCount, count: totalCount })}
      </span>
      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={totalCount}
        aria-valuenow={pickedCount}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
          style={{ width: `${percentPicked}%` }}
        />
      </div>
    </div>
  );
}
