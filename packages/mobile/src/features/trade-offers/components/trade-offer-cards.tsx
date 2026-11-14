import { useTranslation } from "react-i18next";
import { formatPrice } from "@magic-vault/shared";
import { CardThumbnail } from "@/components/cards/card-thumbnail";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import type { TradeOfferCardsProps } from "@/lib/interfaces/trade-offers";

export function TradeOfferCards({ cards, prices, priceSource }: TradeOfferCardsProps) {
  const { t } = useTranslation();
  return (
    <ListGroup>
      {cards.map((card, index) => (
        <ListRow
          key={"scanId" in card ? card.scanId : `${card.gameKey}-${card.cardId}-${index}`}
          title={card.name}
          subtitle={[
            card.setName || card.setCode.toUpperCase(),
            t(`trade.conditions.${card.condition}`),
            card.isFoil ? t("tradeOffers.foil") : null,
            "quantity" in card && card.quantity > 1 ? `×${card.quantity}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          leading={<CardThumbnail imageUrl={card.imageUrl} />}
          value={prices[index] == null ? t("tradeOffers.noPrice") : formatPrice(prices[index], priceSource)}
        />
      ))}
    </ListGroup>
  );
}
