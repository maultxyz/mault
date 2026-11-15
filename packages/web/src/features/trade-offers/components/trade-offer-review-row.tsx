import { CardImage } from "@/components/card-image";
import { Badge } from "@/components/ui/badge";
import { tradeOfferPlacementLines } from "@/features/trade-offers/lib/placement-lines";
import type { TradeOfferReviewRowProps } from "@/lib/interfaces/trade-offers";
import { cn } from "@/lib/utils";
import { formatPrice } from "@magic-vault/shared";
import { IconAlertTriangle, IconMapPin } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function TradeOfferReviewRow({
  row,
  priceSource,
  showsPlacement,
  showsPrice = true,
}: TradeOfferReviewRowProps) {
  const { t } = useTranslation("common");
  const { card } = row;
  const placementLines = showsPlacement ? tradeOfferPlacementLines(row.placements, t) : [];

  return (
    <li className="flex items-start gap-2 py-2 md:py-1.5">
      <CardImage
        src={card.imageUrl ?? undefined}
        alt=""
        className="aspect-[2.5/3.5] w-9 shrink-0 rounded-sm"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-control font-medium">{card.name}</span>
        <span className="truncate text-xs text-foreground/70">
          {[card.setName || card.setCode.toUpperCase(), card.collectorNumber ? `#${card.collectorNumber}` : null]
            .filter(Boolean)
            .join(" · ")}
        </span>
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary">{card.condition}</Badge>
          {card.isFoil && <Badge variant="secondary">{t("tradeOffers.cardList.foil")}</Badge>}
        </div>
        {placementLines.map((line, index) => (
          <span
            key={`${line.text}-${index}`}
            className={cn(
              "flex items-center gap-1 text-xs",
              line.isMissing ? "text-warning-foreground" : "text-foreground/70",
            )}
          >
            {line.isMissing ? (
              <IconAlertTriangle className="size-3 shrink-0" aria-hidden />
            ) : (
              <IconMapPin className="size-3 shrink-0" aria-hidden />
            )}
            <span className="min-w-0 break-words">{line.text}</span>
          </span>
        ))}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
        <span className="flex items-center gap-1.5">
          {row.quantity > 1 && <Badge variant="secondary">×{row.quantity}</Badge>}
          {showsPrice && (
            <span className="text-control font-medium tabular-nums">
              {row.totalPrice == null
                ? t("tradeOffers.cardList.noPrice")
                : formatPrice(row.totalPrice, priceSource)}
            </span>
          )}
        </span>
        {showsPrice && row.quantity > 1 && row.unitPrice != null && (
          <span className="text-xs text-foreground/70 tabular-nums">
            {t("tradeOffers.cardList.unitPrice", { price: formatPrice(row.unitPrice, priceSource) })}
          </span>
        )}
      </div>
    </li>
  );
}
