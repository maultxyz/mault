import { Button } from "@/components/ui/button";
import { useTradeOfferContext } from "@/lib/trade-offer-context";
import { IconArrowsExchange } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function TradeOfferReviewBar() {
  const { t } = useTranslation("cards");
  const tradeOffer = useTradeOfferContext();
  const wantedCount = tradeOffer?.wanted.length ?? 0;
  if (!tradeOffer || wantedCount === 0) return null;
  return (
    <div className="shrink-0 border-t bg-background p-2">
      <Button size="lg" className="w-full" onClick={tradeOffer.openComposer}>
        <IconArrowsExchange />
        {t("tradeOffers.reviewBar", { count: wantedCount })}
      </Button>
    </div>
  );
}
