import { useTranslation } from "react-i18next";
import { formatPrice } from "@magic-vault/shared";
import { CardThumbnail } from "@/components/cards/card-thumbnail";
import { ListRow } from "@/components/ui/list-row";
import { tradeOfferPlacementLines } from "@/features/trade-offers/lib/placement-lines";
import type { TradeOfferReviewRowProps } from "@/lib/interfaces/trade-offers";

export function TradeOfferReviewRow({
  row,
  priceSource,
  showsPlacement,
  showsPrice = true,
}: TradeOfferReviewRowProps) {
  const { t } = useTranslation();
  const { card } = row;
  const detailLine = [
    card.setName || card.setCode.toUpperCase(),
    card.collectorNumber ? `#${card.collectorNumber}` : null,
    t(`trade.conditions.${card.condition}`),
    card.isFoil ? t("tradeOffers.cardList.foil") : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const quantityLine =
    row.quantity > 1
      ? [
          `×${row.quantity}`,
          showsPrice && row.unitPrice != null
            ? t("tradeOffers.cardList.unitPrice", { price: formatPrice(row.unitPrice, priceSource) })
            : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;
  const placementLines = showsPlacement ? tradeOfferPlacementLines(row.placements, t) : [];
  const subtitleLines = [detailLine, quantityLine, ...placementLines].filter((line): line is string => !!line);
  return (
    <ListRow
      title={card.name}
      subtitle={subtitleLines.join("\n")}
      subtitleNumberOfLines={subtitleLines.length + 1}
      leading={<CardThumbnail imageUrl={card.imageUrl} />}
      value={
        !showsPrice
          ? undefined
          : row.totalPrice == null
            ? t("tradeOffers.cardList.noPrice")
            : formatPrice(row.totalPrice, priceSource)
      }
    />
  );
}
