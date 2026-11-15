import { CardImage } from "@/components/card-image";
import { usePriceSource } from "@/hooks/use-price-source";
import {
  CARD_PRINTING_TILE_ART_CLASS,
  CARD_PRINTING_TILE_CLASS,
} from "@/lib/constants/search";
import { catalogPrintingLabel } from "@magic-vault/shared";
import type { CardPrintingTileProps } from "@/lib/interfaces/search";
import { IconCircleCheckFilled } from "@tabler/icons-react";

export function CardPrintingTile({ printing, isSelected, onSelect }: CardPrintingTileProps) {
  const { priceOf, format } = usePriceSource();
  const price = priceOf(printing, false);
  const setLabel = printing.setName || printing.set.toUpperCase();
  return (
    <li>
      <button
        type="button"
        aria-pressed={isSelected}
        aria-label={[catalogPrintingLabel(printing), price != null ? format(price) : null].filter(Boolean).join(", ")}
        className={CARD_PRINTING_TILE_CLASS}
        onClick={() => onSelect(printing)}
      >
        <span className={CARD_PRINTING_TILE_ART_CLASS}>
          <CardImage src={printing.image?.normal ?? printing.image?.small} placeholderSrc={printing.image?.small} alt="" />
          {isSelected && (
            <span className="absolute top-1 right-1 flex rounded-full bg-card text-primary" aria-hidden="true">
              <IconCircleCheckFilled className="size-5" />
            </span>
          )}
        </span>
        <span className="flex min-w-0 flex-col" aria-hidden="true">
          <span className="truncate text-xs font-medium text-foreground">{setLabel}</span>
          <span className="truncate text-2xs text-foreground/70">
            {[printing.collectorNumber ? `#${printing.collectorNumber}` : null, price != null ? format(price) : null]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
      </button>
    </li>
  );
}
