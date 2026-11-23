import { SettingsSectionSkeleton } from "@/components/settings-section-skeleton";
import { SkeletonStatus } from "@/components/skeleton-status";
import { StatGroupSkeleton } from "@/components/stat-group-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { ValueHeroSkeleton } from "@/features/stats/components/value-hero-skeleton";
import { STATS_HIGHLIGHTS_SKELETON_TILES } from "@/lib/constants/skeletons";
import { STATS_HIGHLIGHT_TILE_CLASS } from "@/lib/constants/stats";

export function StatsDashboardSkeleton() {
  return (
    <SkeletonStatus className="flex flex-col gap-6 md:gap-2">
      <div className="grid gap-4 md:gap-1.5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <ValueHeroSkeleton />
        <StatGroupSkeleton tiles={4} gridClassName="grid-cols-2" hasIcons hasDetails />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-28 md:h-3.5" />
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: STATS_HIGHLIGHTS_SKELETON_TILES }).map((_, index) => (
            <div key={index} className={STATS_HIGHLIGHT_TILE_CLASS}>
              <Skeleton className="size-9 rounded-full" />
              <div className="mt-auto flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:gap-1.5 lg:grid-cols-2 [&>*]:min-w-0">
        <SettingsSectionSkeleton hasAction>
          <Skeleton className="h-44 w-full md:h-36" />
        </SettingsSectionSkeleton>
        <SettingsSectionSkeleton>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-2.5 w-full" />
          </div>
        </SettingsSectionSkeleton>
      </div>
    </SkeletonStatus>
  );
}
