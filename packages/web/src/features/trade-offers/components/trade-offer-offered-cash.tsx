import type { TradeOfferOfferedCashProps } from "@/lib/interfaces/trade-offers";
import { formatTradeOfferCash, tradeOfferOfferedCash } from "@magic-vault/shared";
import { IconCash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function TradeOfferOfferedCash({ offer }: TradeOfferOfferedCashProps) {
  const { t } = useTranslation("common");
  const cash = tradeOfferOfferedCash(offer);
  if (cash) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-foreground/6 p-2 text-control font-medium">
        <IconCash aria-hidden className="size-4 shrink-0 text-foreground/70" />
        {t("tradeOffers.cashAmount", { amount: formatTradeOfferCash(cash) })}
      </p>
    );
  }
  if (offer.offered.length > 0) return null;
  return (
    <p className="rounded-lg bg-foreground/6 p-2 text-control text-foreground/70">
      {t("tradeOffers.nothingOffered")}
    </p>
  );
}
