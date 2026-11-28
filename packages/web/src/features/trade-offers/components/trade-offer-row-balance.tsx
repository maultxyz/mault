import { isUnpricedTradeSide } from "@/features/trade-offers/lib/trade-offer-row-cards";
import type { TradeOfferRowBalanceProps } from "@/lib/interfaces/trade-offers";
import { cn } from "@/lib/utils";
import { formatPrice, tradeOfferValueDifference } from "@magic-vault/shared";
import { IconScale } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function TradeOfferRowBalance({ offer }: TradeOfferRowBalanceProps) {
  const { t } = useTranslation("common");
  const isUnpriced =
    isUnpricedTradeSide(offer.wantedPrices, offer.wantedValue) ||
    isUnpricedTradeSide(offer.offeredPrices, offer.offeredValue);
  const difference = tradeOfferValueDifference(offer);
  const amount = formatPrice(Math.abs(difference), offer.priceSource);
  return (
    <span
      className={cn(
        "flex items-center justify-end gap-1 text-xs font-medium tabular-nums",
        isUnpriced || difference === 0
          ? "text-foreground/70"
          : difference > 0
            ? "text-success-foreground"
            : "text-warning-foreground",
      )}
    >
      <IconScale aria-hidden className="size-3.5 shrink-0" />
      {isUnpriced
        ? t("tradeOffers.library.balanceUnpriced")
        : difference > 0
          ? t("tradeOffers.library.balanceGain", { amount })
          : difference < 0
            ? t("tradeOffers.library.balanceLose", { amount })
            : t("tradeOffers.library.balanceEven")}
    </span>
  );
}
