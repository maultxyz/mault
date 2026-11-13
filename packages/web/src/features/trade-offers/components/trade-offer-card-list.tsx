import { Badge } from "@/components/ui/badge";
import type { TradeOfferCardListProps } from "@/lib/interfaces/trade-offers";
import { formatPrice } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function TradeOfferCardList({ cards, prices, priceSource }: TradeOfferCardListProps) {
  const { t } = useTranslation("cards");
  return (
    <ul className="flex flex-col divide-y divide-border">
      {cards.map((card, index) => (
        <li
          key={"scanId" in card ? card.scanId : `${card.gameKey}-${card.cardId}-${index}`}
          className="flex items-center gap-2 p-2"
        >
          <img
            src={card.imageUrl ?? ""}
            alt=""
            className="aspect-[2.5/3.5] w-8 shrink-0 rounded-sm bg-muted object-cover"
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-control font-medium">{card.name}</span>
            <span className="truncate text-xs text-foreground/70">
              {[card.setName || card.setCode.toUpperCase(), card.collectorNumber ? `#${card.collectorNumber}` : null]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
          {prices && priceSource && (
            <span className="shrink-0 text-control font-medium tabular-nums">
              {prices[index] == null ? t("tradeOffers.noPrice") : formatPrice(prices[index], priceSource)}
            </span>
          )}
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            {"quantity" in card && card.quantity > 1 && (
              <Badge variant="secondary">×{card.quantity}</Badge>
            )}
            <Badge variant="secondary">{card.condition}</Badge>
            {card.isFoil && <Badge variant="secondary">{t("foil")}</Badge>}
          </div>
        </li>
      ))}
    </ul>
  );
}
