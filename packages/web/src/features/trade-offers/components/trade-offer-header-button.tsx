import { CountDot } from "@/components/count-dot";
import { Button } from "@/components/ui/button";
import type { TradeOfferHeaderButtonProps } from "@/lib/interfaces/trade-offers";
import { useTradeOfferContext } from "@/lib/trade-offer-context";
import { IconArrowsExchange } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function TradeOfferHeaderButton({ isIconOnly = false }: TradeOfferHeaderButtonProps) {
  const { t } = useTranslation("cards");
  const tradeOffer = useTradeOfferContext();
  if (!tradeOffer) return null;
  const wantedCount = tradeOffer.wanted.length;
  const label = t("tradeOffers.headerButton", { count: wantedCount });
  return (
    <Button
      variant={wantedCount > 0 ? "selected" : "outline"}
      size={isIconOnly ? "icon" : "default"}
      className={isIconOnly ? "relative shrink-0" : undefined}
      aria-label={isIconOnly ? label : undefined}
      onClick={tradeOffer.openComposer}
    >
      <IconArrowsExchange />
      {isIconOnly ? <CountDot count={wantedCount} /> : label}
    </Button>
  );
}
