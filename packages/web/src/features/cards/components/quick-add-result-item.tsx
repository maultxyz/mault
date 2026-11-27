import { CardImage } from "@/components/card-image";
import { CommandItem } from "@/components/ui/command";
import { usePriceSource } from "@/hooks/use-price-source";
import { SEARCH_RESULT_THUMBNAIL_CLASS } from "@/lib/constants/search";
import type { QuickAddResultItemProps } from "@/lib/interfaces/cards";
import { cardSearchResultKey, MISSING_PRICE_TEXT } from "@magic-vault/shared";

export function QuickAddResultItem({
  card,
  isFoil,
  onSelect,
}: QuickAddResultItemProps) {
  const { priceOf, format } = usePriceSource();
  const price = priceOf(card, isFoil);

  return (
    <CommandItem value={cardSearchResultKey(card)} onSelect={onSelect}>
      <span className={SEARCH_RESULT_THUMBNAIL_CLASS}>
        <CardImage src={card.image?.small} alt="" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{card.name}</span>
        <span className="block truncate text-xs text-foreground/70">
          {[
            card.setName || card.set.toUpperCase(),
            `${card.set.toUpperCase()} #${card.collectorNumber}`,
            card.lang?.toUpperCase(),
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      <span className="shrink-0 text-xs tabular-nums text-foreground/70">
        {price != null ? format(price) : MISSING_PRICE_TEXT}
      </span>
    </CommandItem>
  );
}
