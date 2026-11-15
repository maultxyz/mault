import { formatTradeOfferCash, tradeOfferOfferedCash } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";
import { AppText } from "@/components/ui/app-text";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import type { TradeOfferOfferedCashProps } from "@/lib/interfaces/trade-offers";

export function TradeOfferOfferedCash({ offer }: TradeOfferOfferedCashProps) {
  const { t } = useTranslation();
  const cash = tradeOfferOfferedCash(offer);
  if (cash) {
    return (
      <ListGroup>
        <ListRow icon="coins" title={t("tradeOffers.cashAmount", { amount: formatTradeOfferCash(cash) })} />
      </ListGroup>
    );
  }
  if (offer.offered.length > 0) return null;
  return (
    <AppText size="sm" tone="secondary">
      {t("tradeOffers.nothingOffered")}
    </AppText>
  );
}
