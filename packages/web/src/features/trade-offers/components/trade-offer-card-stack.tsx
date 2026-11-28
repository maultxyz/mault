import { CardImage } from "@/components/card-image";
import { TRADE_OFFER_ROW_THUMBNAIL_LIMIT } from "@/lib/constants/trade-offers";
import type { TradeOfferCardStackProps } from "@/lib/interfaces/trade-offers";
import { cn } from "@/lib/utils";

export function TradeOfferCardStack({ cards }: TradeOfferCardStackProps) {
  if (cards.length === 0) return null;
  const shownCards = cards.slice(0, TRADE_OFFER_ROW_THUMBNAIL_LIMIT);
  const hiddenCount = cards.length - shownCards.length;
  return (
    <span aria-hidden className="flex shrink-0 items-center">
      {shownCards.map((card, index) => (
        <span
          key={card.key}
          className={cn(
            "relative h-10 w-7 overflow-hidden rounded-sm shadow-popover ring-1 ring-border",
            index > 0 && "-ml-3",
          )}
          style={{ zIndex: shownCards.length - index }}
        >
          <CardImage src={card.imageUrl ?? undefined} alt="" />
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="ml-1 text-2xs font-medium text-foreground/70 tabular-nums">
          +{hiddenCount}
        </span>
      )}
    </span>
  );
}
