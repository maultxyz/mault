import { Badge } from "@/components/ui/badge";
import { usePriceSource } from "@/hooks/use-price-source";
import { raritySwatch } from "@/lib/card-swatches";
import type { CardSearchResultTileProps } from "@/lib/interfaces/cards";
import { cn, matchPercent as getMatchPercent } from "@/lib/utils";

export function CardSearchResultTile({
  card,
  disabled = false,
  isSelected = false,
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
      <div className="relative aspect-[2.5/3.5] w-full overflow-hidden rounded-md">
        {card.image?.small ? (
          <img
            src={card.image.normal || card.image.small}
            alt={card.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-background" />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5 px-1 pt-1 pb-0.5">
        <div className="flex min-w-0 flex-row items-center justify-between gap-2">
          <p className="truncate text-xs font-semibold" title={card.name}>
            {card.name}
          </p>
          {matchPercent != null && (
            <Badge
              variant={matchPercent >= 80 ? "default" : "destructive"}
              className={cn(
                "shrink-0 tabular-nums",
                matchPercent < 80 && "bg-destructive text-white",
              )}
            >
              {matchPercent.toFixed(2)}%
            </Badge>
          )}
        </div>
        <div className="flex flex-row items-center justify-between gap-2">
          <div className="flex min-w-0 flex-row items-center gap-1.5">
            <div
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
    </>
  );
  const tileClassName = "flex min-w-0 flex-col rounded-lg border bg-muted p-1 text-left";
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
