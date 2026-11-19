import { Progress } from "@/components/ui/progress";
import type { TradeOfferPickProgressBarProps } from "@/lib/interfaces/trade-offers";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export function TradeOfferPickProgress({ pickedCount, totalCount }: TradeOfferPickProgressBarProps) {
  const { t } = useTranslation("common");
  const labelId = useId();

  return (
    <div className="flex items-center gap-3">
      <span
        id={labelId}
        role="status"
        className="shrink-0 text-xs font-medium text-foreground/70 tabular-nums"
      >
        {t("tradeOffers.pickList.progress", { picked: pickedCount, count: totalCount })}
      </span>
      <Progress
        aria-labelledby={labelId}
        value={pickedCount}
        max={totalCount}
        className="flex-1"
      />
    </div>
  );
}
