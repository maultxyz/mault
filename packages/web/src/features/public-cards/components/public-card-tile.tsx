import { CardImage } from "@/components/card-image";
import { PublicCardBadges } from "@/features/public-cards/components/public-card-badges";
import { usePriceSource } from "@/hooks/use-price-source";
import { raritySwatch } from "@/lib/card-swatches";
import { PUBLIC_CARD_FOIL_GRADIENT_CLASS } from "@/lib/constants/public-cards";
import type { PublicCardTileProps } from "@/lib/interfaces/public-cards";
import { cn } from "@/lib/utils";
import { rarityLabel } from "@magic-vault/shared";
import { IconSparkles } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function PublicCardTile({ entry, onOpen }: PublicCardTileProps) {
  const { t } = useTranslation("cards");
  const { priceOf, format } = usePriceSource();
  const price = priceOf(
    entry.card,
    { isFoil: entry.isFoil, foilType: entry.foilType ?? undefined },
    entry.condition,
  );
  const finish = entry.isFoil ? (entry.foilType ?? t("foil")) : null;
  return (
    <button
      type="button"
      data-shop-card={entry.scanId}
      onClick={() => onOpen(entry.scanId)}
      aria-label={t("publicBrowse.openCard", {
        name: entry.card.name,
        details: [entry.card.setName, entry.condition, finish, price != null ? format(price) : null]
          .filter(Boolean)
          .join(", "),
      })}
      className="flex cursor-pointer flex-col rounded-card bg-card p-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="relative block aspect-[2.5/3.5] overflow-hidden rounded-lg">
        {entry.isFoil && (
          <span
            className={cn(
              "absolute top-1 left-1 z-20 rounded-full p-0.5 shadow-md",
              PUBLIC_CARD_FOIL_GRADIENT_CLASS,
            )}
            aria-hidden
          >
            <IconSparkles className="size-3 text-white" />
          </span>
        )}
        <PublicCardBadges entry={entry} className="absolute right-1 bottom-1 left-1 z-20" />
        <CardImage
          src={entry.card.image?.normal || entry.card.image?.small}
          placeholderSrc={entry.card.image?.small}
          alt=""
        />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5 px-1 pt-1 pb-1">
        <span className="truncate text-xs font-semibold">{entry.card.name}</span>
        <span className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: raritySwatch(entry.card.rarity).bg }}
              title={rarityLabel(entry.card.rarity)}
              aria-hidden
            />
            <span className="truncate text-xs font-semibold uppercase">{entry.card.set}</span>
            {entry.card.collectorNumber && (
              <span className="min-w-0 truncate text-xs text-foreground/70">
                #{entry.card.collectorNumber}
              </span>
            )}
          </span>
          {price != null && (
            <span className="shrink-0 text-xs font-medium text-foreground/70">
              {format(price)}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
