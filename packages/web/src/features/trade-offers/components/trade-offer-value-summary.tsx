import type { TradeOfferValueSummaryProps } from "@/lib/interfaces/trade-offers";
import { cn } from "@/lib/utils";
import { formatPrice } from "@magic-vault/shared";
import { IconScale } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function TradeOfferValueSummary({ offer }: TradeOfferValueSummaryProps) {
  const { t } = useTranslation("common");
  const difference = Math.round((offer.offeredValue - offer.wantedValue) * 100) / 100;
  const format = (value: number) => formatPrice(value, offer.priceSource);
  const hasMissingPrices =
    offer.wantedPrices.some((price) => price == null) ||
    offer.offeredPrices.some((price) => price == null);

  return (
    <div className="flex flex-col gap-1 rounded-lg p-3 ring-1 ring-border">
      <div className="grid grid-cols-2 gap-3 text-control">
        <div className="flex flex-col">
          <span className="text-xs text-foreground/70">{t("tradeOffers.theyGetValue")}</span>
          <span className="text-base font-semibold tabular-nums">{format(offer.wantedValue)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-foreground/70">{t("tradeOffers.youGetValue")}</span>
          <span className="text-base font-semibold tabular-nums">{format(offer.offeredValue)}</span>
        </div>
      </div>
      <p
        className={cn(
          "flex items-center gap-1.5 text-xs",
          difference > 0
            ? "text-success-foreground"
            : difference < 0
              ? "text-warning-foreground"
              : "text-foreground/70",
        )}
      >
        <IconScale className="size-3.5 shrink-0" aria-hidden />
        {difference > 0
          ? t("tradeOffers.youGainValue", { amount: format(difference) })
          : difference < 0
            ? t("tradeOffers.youLoseValue", { amount: format(-difference) })
            : t("tradeOffers.evenValue")}
      </p>
      {hasMissingPrices && (
        <p className="text-xs text-foreground/70">{t("tradeOffers.missingPrices")}</p>
      )}
    </div>
  );
}
