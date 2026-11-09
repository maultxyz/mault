import { Badge } from "@/components/ui/badge";
import { usePriceSource } from "@/hooks/use-price-source";
import type { SharedStorageCardTileProps } from "@/lib/interfaces/share-links";
import { DEFAULT_CARD_CONDITION } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function SharedStorageCardTile({ entry }: SharedStorageCardTileProps) {
  const { t } = useTranslation("cards");
  const { priceOf, format } = usePriceSource();
  const price = priceOf(
    entry.card,
    { isFoil: entry.isFoil, foilType: entry.foilType ?? undefined },
    entry.condition,
  );
  return (
    <figure className="flex flex-col gap-1">
      <div className="relative aspect-[2.5/3.5] overflow-hidden rounded-md">
        <img
          loading="lazy"
          src={entry.card.image?.normal || ""}
          alt={entry.card.name}
          className="size-full object-cover"
        />
        <div className="absolute bottom-1 left-1 flex flex-wrap gap-1">
          {entry.isFoil && (
            <Badge variant="secondary" className="shadow-md">
              {entry.foilType ?? t("foil")}
            </Badge>
          )}
          {entry.condition !== DEFAULT_CARD_CONDITION && (
            <Badge variant="secondary" className="shadow-md">
              {entry.condition}
            </Badge>
          )}
        </div>
      </div>
      <figcaption className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium">{entry.card.name}</span>
        <span className="truncate text-xs text-foreground/70">
          {[entry.card.setName, price != null ? format(price) : null]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </figcaption>
    </figure>
  );
}
