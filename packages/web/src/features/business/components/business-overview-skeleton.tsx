import { SkeletonStatus } from "@/components/skeleton-status";
import { StatGroupSkeleton } from "@/components/stat-group-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BUSINESS_OVERVIEW_CHART_SKELETON_COUNT,
  BUSINESS_OVERVIEW_HIGHLIGHT_SKELETON_COUNT,
  BUSINESS_OVERVIEW_SECTION_SKELETON_COUNT,
} from "@/lib/constants/business";

export function BusinessOverviewSkeleton() {
  return (
    <SkeletonStatus className="flex flex-col gap-6 md:gap-2">
      <div className="grid gap-4 md:gap-1.5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <StatGroupSkeleton tiles={3} gridClassName="grid-cols-2 sm:grid-cols-3" hasIcons hasDetails />
        <StatGroupSkeleton tiles={3} gridClassName="grid-cols-2 sm:grid-cols-3" hasIcons hasDetails />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-36 md:h-3.5" />
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: BUSINESS_OVERVIEW_HIGHLIGHT_SKELETON_COUNT }).map((_, index) => (
            <div key={index} className="flex flex-col gap-3 rounded-card bg-card p-4 md:gap-1.5 md:p-2.5">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:gap-1.5 lg:grid-cols-2">
        {Array.from({ length: BUSINESS_OVERVIEW_CHART_SKELETON_COUNT }).map((_, index) => (
          <div key={index} className="flex flex-col gap-4 rounded-card bg-card p-5 md:gap-2 md:p-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3.5 w-48" />
              </div>
              <Skeleton className="h-7 w-32 rounded-lg max-md:h-10" />
            </div>
            <Skeleton className="h-44 w-full rounded-md md:h-36" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 md:gap-1.5">
        {Array.from({ length: BUSINESS_OVERVIEW_SECTION_SKELETON_COUNT }).map((_, index) => (
          <div key={index} className="flex flex-col gap-3 rounded-card bg-card p-4 md:gap-2 md:p-2.5">
            <div className="flex items-start gap-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
            <Skeleton className="h-7 w-32 rounded-lg max-md:h-10" />
          </div>
        ))}
      </div>
    </SkeletonStatus>
  );
}
