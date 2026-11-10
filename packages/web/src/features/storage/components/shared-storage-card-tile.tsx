import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardHoldBadge } from "@/features/card-holds/components/card-hold-badge";
import { usePriceSource } from "@/hooks/use-price-source";
import { useCardHoldsContext } from "@/lib/card-holds-context";
import type { SharedStorageCardTileProps } from "@/lib/interfaces/share-links";
import { DEFAULT_CARD_CONDITION } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function SharedStorageCardTile({ entry }: SharedStorageCardTileProps) {
  const { t } = useTranslation("cards");
  const { t: tCommon } = useTranslation("common");
  const { priceOf, format } = usePriceSource();
  const cardHolds = useCardHoldsContext();
  const scanIds = [entry.scanId];
  const hold = cardHolds?.holdFor(scanIds);
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
        <CardHoldBadge scanIds={scanIds} className="absolute top-1 right-1 shadow-md" />
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
      {cardHolds && (
        <Button
          variant="outline"
          disabled={hold !== undefined && !hold.isMine}
          aria-label={
            hold?.isMine
              ? tCommon("cardHolds.manageHoldFor", { name: entry.card.name })
              : tCommon("cardHolds.holdCardFor", { name: entry.card.name })
          }
          onClick={() =>
            cardHolds.openHoldDialog({
              scanIds,
              card: entry.card,
              isFoil: entry.isFoil,
              foilType: entry.foilType ?? undefined,
              condition: entry.condition,
            })
          }
        >
          {hold?.isMine
            ? tCommon("cardHolds.manageHold")
            : hold
              ? tCommon("cardHolds.onHoldBadge")
              : tCommon("cardHolds.hold")}
        </Button>
      )}
    </figure>
  );
}
