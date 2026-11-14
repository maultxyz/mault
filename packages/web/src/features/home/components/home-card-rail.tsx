import { CardImage } from "@/components/card-image";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { collectionViewPath, monitorCollectionPath } from "@/lib/constants/collections";
import { HOME_CARD_RAIL_TILE_CLASS } from "@/lib/constants/home";
import type { HomeCardRailProps } from "@/lib/interfaces/home";
import { Link } from "react-router-dom";

export function HomeCardRail({
  title,
  cards,
  captionOf,
  tileClassName = HOME_CARD_RAIL_TILE_CLASS,
  action,
}: HomeCardRailProps) {
  const isMobile = useIsMobile();
  if (cards.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-base font-semibold text-foreground md:text-sm">{title}</h2>
        {action && (
          <Link
            to={action.to}
            className="text-sm font-semibold text-primary hover:underline dark:text-sidebar-primary"
          >
            {action.label}
          </Link>
        )}
      </div>
      <ul className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 md:-mx-1 md:px-1">
        {cards.map((card) => (
          <li key={card.scanId} className={tileClassName}>
            <Link
              to={
                isMobile
                  ? monitorCollectionPath(card.collectionGuid)
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
                <span className="block truncate text-xs text-foreground/70 tabular-nums">{captionOf(card)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
