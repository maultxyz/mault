import { Button } from "@/components/ui/button";
import { useTradeOfferContext } from "@/lib/trade-offer-context";
import { IconArrowsExchange } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function TradeOfferHeaderButton() {
  const { t } = useTranslation("cards");
  const tradeOffer = useTradeOfferContext();
  if (!tradeOffer) return null;
  return (
    <Button
      variant={tradeOffer.wanted.length > 0 ? "selected" : "outline"}
      onClick={tradeOffer.openComposer}
    >
      <IconArrowsExchange />
      {t("tradeOffers.headerButton", { count: tradeOffer.wanted.length })}
    </Button>
  );
}
