import { Skeleton } from "@/components/ui/skeleton";
import { CARD_GRID_CLASS } from "@/lib/constants/card-grid";
import { PUBLIC_CARDS_LOADING_TILE_COUNT } from "@/lib/constants/public-cards";

export function PublicCardTileSkeletons() {
  return (
    <div className={CARD_GRID_CLASS}>
      {Array.from({ length: PUBLIC_CARDS_LOADING_TILE_COUNT }, (_, tileIndex) => (
        <div key={tileIndex} className="flex flex-col gap-1.5">
          <Skeleton className="aspect-[2.5/3.5] w-full rounded-lg" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}
