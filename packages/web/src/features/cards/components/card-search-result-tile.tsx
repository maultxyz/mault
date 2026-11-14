import { CardImage } from "@/components/card-image";
import { Badge } from "@/components/ui/badge";
import { usePriceSource } from "@/hooks/use-price-source";
import { raritySwatch } from "@/lib/card-swatches";
import type { CardSearchResultTileProps } from "@/lib/interfaces/cards";
import { cn, matchPercent as getMatchPercent } from "@/lib/utils";
import { DEFAULT_CARD_LANGUAGE, rarityLabel } from "@magic-vault/shared";

export function CardSearchResultTile({
  card,
  disabled = false,
  isSelected = false,
  reviewLayout = false,
  className,
  onClick,
  onKeyDown,
}: CardSearchResultTileProps) {
  const { priceOf, format } = usePriceSource();
  const displayPrice = priceOf(card, false);
  const matchPercent =
    "distance" in card && card.distance != null ? getMatchPercent(card) : null;
  const content = (
    <>
      <div className="relative aspect-[2.5/3.5] w-full overflow-hidden rounded-lg">
        {card.image?.small ? (
          <CardImage
            src={card.image.normal || card.image.small}
            placeholderSrc={card.image.small}
            alt={card.name}
          />
        ) : (
          <div className="h-full w-full bg-background" />
        )}
      </div>
      {reviewLayout ? (
        <div className="flex min-w-0 flex-col gap-0.5 px-1 pt-1.5 pb-0.5 leading-tight">
          <div className="flex min-w-0 items-center gap-1.5">
            <p
              className="min-w-0 flex-1 truncate text-xs font-semibold"
              title={card.name}
            >
              {card.name}
            </p>
            {matchPercent != null && (
              <Badge
                variant={matchPercent >= 80 ? "default" : "destructive"}
                className="shrink-0 tabular-nums"
              >
                {matchPercent.toFixed(2)}%
              </Badge>
            )}
          </div>
          <p
            className="truncate text-xs text-foreground/70"
            title={card.setName}
          >
            {card.setName || card.set.toUpperCase()}
          </p>
          <div className="flex min-w-0 items-center gap-1.5 text-xs tabular-nums">
            <span
              role="img"
              aria-label={rarityLabel(card.rarity)}
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: raritySwatch(card.rarity).bg }}
              title={card.rarity}
            />
            <span className="min-w-0 truncate font-semibold uppercase">
              {card.set} #{card.collectorNumber}
            </span>
            {card.lang && card.lang !== DEFAULT_CARD_LANGUAGE && (
              <span className="shrink-0 font-semibold uppercase text-foreground/70">
                {card.lang}
              </span>
            )}
            {displayPrice != null && (
              <span className="ml-auto shrink-0 font-medium">
                {format(displayPrice)}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-w-0 flex-col gap-0.5 px-1 pt-1 pb-0.5">
          <div className="flex min-w-0 flex-row items-center justify-between gap-2">
            <p className="truncate text-xs font-semibold" title={card.name}>
              {card.name}
            </p>
            {matchPercent != null && (
              <Badge
                variant={matchPercent >= 80 ? "default" : "destructive"}
                className="shrink-0 tabular-nums"
              >
                {matchPercent.toFixed(2)}%
              </Badge>
            )}
          </div>
          <div className="flex flex-row items-center justify-between gap-2">
            <div className="flex min-w-0 flex-row items-center gap-1.5">
              <div
                role="img"
                aria-label={rarityLabel(card.rarity)}
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: raritySwatch(card.rarity).bg }}
              />
              <p
                className="truncate text-xs font-semibold uppercase"
                title={card.setName}
              >
                {card.set}
              </p>
              <p className="shrink-0 text-xs text-foreground/70">
                #{card.collectorNumber}
              </p>
            </div>
            <div className="flex shrink-0 flex-row items-center gap-1.5">
              {card.lang && (
                <Badge variant="outline" className="uppercase">
                  {card.lang}
                </Badge>
              )}
              {displayPrice != null && (
                <p className="text-xs font-medium text-foreground/70">
                  {format(displayPrice)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
  const tileClassName =
    "flex min-w-0 flex-col rounded-xl bg-muted p-1.5 text-left";
  if (!onClick) {
    return <div className={cn(tileClassName, className)}>{content}</div>;
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-pressed={isSelected}
      className={cn(
        tileClassName,
        "cursor-pointer transition-[box-shadow,transform] outline-none hover:ring-2 hover:ring-primary/50 focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
        isSelected && "ring-2 ring-primary ring-offset-1 hover:ring-primary",
        className,
      )}
    >
      {content}
    </button>
  );
}
