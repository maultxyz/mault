import { CardImage } from "@/components/card-image";
import { CardReservationQuickToggle } from "@/features/card-reservations/components/card-reservation-quick-toggle";
import { CardReservationTileBadge } from "@/features/card-reservations/components/card-reservation-tile-badge";
import { useCardReservationTileLabel } from "@/features/card-reservations/lib/use-card-reservation-tile-label";
import { PublicCardBadges } from "@/features/public-cards/components/public-card-badges";
import { usePriceSource } from "@/hooks/use-price-source";
import { RarityBadge } from "@/components/rarity-badge";
import { FOIL_GRADIENT_CLASS } from "@/lib/constants/ui";
import type { PublicCardTileProps } from "@/lib/interfaces/public-cards";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTradeOfferContext } from "@/lib/trade-offer-context";
import { rarityLabel } from "@magic-vault/shared";
import { IconCheck, IconPlus, IconSparkles } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function PublicCardTile({ entry, onOpen }: PublicCardTileProps) {
  const { t } = useTranslation("cards");
  const { priceOf, format } = usePriceSource();
  const price =
    entry.sellPrice !== undefined
      ? entry.sellPrice
      : priceOf(entry.card, { isFoil: entry.isFoil, foilType: entry.foilType ?? undefined }, entry.condition);
  const finish = entry.isFoil ? (entry.foilType ?? t("foil")) : null;
  const tradeOffer = useTradeOfferContext();
  const isWanted = tradeOffer?.isWanted(entry.scanId) ?? false;
  const reservationLabel = useCardReservationTileLabel(entry.scanId);
  return (
    <div className="relative flex flex-col">
      <button
        type="button"
        data-shop-card={entry.scanId}
        onClick={() => onOpen(entry.scanId)}
        aria-label={t("publicBrowse.openCard", {
          name: entry.card.name,
          details: [
            entry.card.setName,
            rarityLabel(entry.card.rarity),
            entry.condition,
            finish,
            price != null ? format(price) : null,
            reservationLabel?.text,
          ]
            .filter(Boolean)
            .join(", "),
        })}
        className={cn(
          "flex flex-1 cursor-pointer flex-col rounded-card bg-card p-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isWanted && "ring-2 ring-primary",
        )}
      >
        <span className="relative block aspect-[2.5/3.5] overflow-hidden rounded-lg">
          {entry.isFoil && (
            <span
              className={cn(
                "absolute top-1 left-1 z-20 rounded-full p-0.5 shadow-md",
                FOIL_GRADIENT_CLASS,
              )}
              aria-hidden
            >
              <IconSparkles className="size-3 text-white" />
            </span>
          )}
          <PublicCardBadges entry={entry} className="absolute right-1 bottom-1 left-1 z-20">
            <CardReservationTileBadge scanId={entry.scanId} />
          </PublicCardBadges>
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
              <RarityBadge rarity={entry.card.rarity} decorative />
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
      {tradeOffer && (
        <Button
          type="button"
          size="icon"
          variant={isWanted ? "default" : "outline"}
          className={cn("absolute top-2.5 right-2.5 z-30 shadow-popover", !isWanted && "dark:bg-card")}
          aria-pressed={isWanted}
          aria-label={t(isWanted ? "tradeOffers.quickRemove" : "tradeOffers.quickAdd", {
            name: entry.card.name,
          })}
          onClick={() => tradeOffer.toggleWanted(entry)}
        >
          {isWanted ? <IconCheck /> : <IconPlus />}
        </Button>
      )}
      {!tradeOffer && <CardReservationQuickToggle entry={entry} />}
    </div>
  );
}
