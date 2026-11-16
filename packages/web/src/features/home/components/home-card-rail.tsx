import { CardImage } from "@/components/card-image";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { collectionViewPath } from "@/lib/constants/collections";
import { HOME_CARD_RAIL_LOADING_TILE_COUNT, HOME_CARD_RAIL_TILE_CLASS } from "@/lib/constants/home";
import { monitorCollectionCardPath } from "@/lib/constants/scanner";
import type { HomeCardRailProps } from "@/lib/interfaces/home";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export function HomeCardRail({
  title,
  cards,
  captionOf,
  priceChangeOf,
  tileClassName = HOME_CARD_RAIL_TILE_CLASS,
  action,
  isLoading = false,
  loadingTileCount = HOME_CARD_RAIL_LOADING_TILE_COUNT,
}: HomeCardRailProps) {
  const isMobile = useIsMobile();
  if (!isLoading && cards.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-base font-semibold text-foreground md:text-sm">{title}</h2>
        {action && (
          <Link
            to={action.to}
            className="text-sm font-semibold text-primary hover:underline"
          >
            {action.label}
          </Link>
        )}
      </div>
      <ul
        aria-busy={isLoading}
        className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 md:-mx-1 md:px-1"
      >
        {isLoading &&
          Array.from({ length: loadingTileCount }).map((_, index) => (
            <li key={index} className={tileClassName} aria-hidden="true">
              <span className="flex flex-col gap-1.5">
                <Skeleton className="aspect-[2.5/3.5] w-full rounded-lg" />
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-3 w-1/2" />
              </span>
            </li>
          ))}
        {!isLoading && cards.map((card) => {
          const priceChange = priceChangeOf?.(card) ?? null;
          return (
          <li key={card.scanId} className={tileClassName}>
            <Link
              to={
                isMobile
                  ? monitorCollectionCardPath(card.collectionGuid, card.scanId)
                  : `${collectionViewPath(card.collectionGuid)}/cards/${card.scanId}`
              }
              className="flex flex-col gap-1.5 rounded-lg transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] motion-reduce:active:scale-100"
            >
              <span className="relative block aspect-[2.5/3.5] w-full overflow-hidden rounded-lg bg-muted">
                <CardImage
                  src={card.card.image?.normal || card.card.image?.small}
                  placeholderSrc={card.card.image?.small}
                  alt={card.card.name}
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">{card.card.name}</span>
                <span className="block truncate text-xs text-foreground/70 tabular-nums">
                  {priceChange && (
                    <>
                      <span
                        className={cn(
                          "font-semibold",
                          priceChange.direction === "up"
                            ? "text-success-foreground"
                            : "text-destructive-strong dark:text-destructive",
                        )}
                      >
                        {priceChange.change}
                      </span>
                      {" · "}
                    </>
                  )}
                  {captionOf(card)}
                </span>
              </span>
            </Link>
          </li>
          );
        })}
      </ul>
    </section>
  );
}
