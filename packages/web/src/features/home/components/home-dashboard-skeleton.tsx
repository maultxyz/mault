import { SkeletonStatus } from "@/components/skeleton-status";
import { Skeleton } from "@/components/ui/skeleton";
import { HomeCardRailSkeletonTiles } from "@/features/home/components/home-card-rail-skeleton";
import { ValueHeroSkeleton } from "@/features/stats/components/value-hero-skeleton";
import {
  HOME_CARD_OF_THE_DAY_TILE_CLASS,
  HOME_CARD_RAIL_LOADING_TILE_COUNT,
} from "@/lib/constants/home";

export function HomeDashboardSkeleton() {
  return (
    <SkeletonStatus className="flex flex-col gap-6 md:gap-2">
      <ValueHeroSkeleton />
      <div className="flex flex-col gap-2">
        <div className="flex h-6 items-center md:h-5">
          <Skeleton className="h-4 w-32 md:h-3.5" />
        </div>
        <ul className="-mx-4 flex gap-3 overflow-hidden px-4 pb-1 md:-mx-1 md:px-1">
          <HomeCardRailSkeletonTiles
            tileClassName={HOME_CARD_OF_THE_DAY_TILE_CLASS}
            tileCount={HOME_CARD_RAIL_LOADING_TILE_COUNT}
          />
        </ul>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex h-6 items-center md:h-5">
          <Skeleton className="h-4 w-24 md:h-3.5" />
        </div>
        <div className="flex flex-col gap-4 rounded-card bg-card p-5 md:gap-2 md:p-2.5">
          <div className="flex gap-8">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-1">
                <div className="flex h-8 items-center">
                  <Skeleton className="h-6 w-12" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-2.5 w-full" />
          </div>
        </div>
      </div>
    </SkeletonStatus>
  );
}
