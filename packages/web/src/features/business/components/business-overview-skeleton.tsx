import { SkeletonStatus } from "@/components/skeleton-status";
import { StatGroupSkeleton } from "@/components/stat-group-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BUSINESS_OVERVIEW_CHART_SKELETON_COUNT,
  BUSINESS_OVERVIEW_LIST_SKELETON_PANELS,
  BUSINESS_OVERVIEW_LIST_SKELETON_ROWS,
  BUSINESS_OVERVIEW_PERFORMANCE_SKELETON_TILES,
  BUSINESS_OVERVIEW_TODO_SKELETON_ROWS,
} from "@/lib/constants/business";

function SkeletonPanelHeading() {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3.5 w-48" />
      </div>
      <Skeleton className="h-7 w-32 rounded-lg max-md:h-10" />
    </div>
  );
}

export function BusinessOverviewSkeleton() {
  return (
    <SkeletonStatus className="flex flex-col gap-6 md:gap-2">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24 md:h-3.5" />
        <div className="flex flex-col rounded-card bg-card p-3 md:p-2">
          {Array.from({ length: BUSINESS_OVERVIEW_TODO_SKELETON_ROWS }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 px-2 py-1.5 md:gap-2">
              <Skeleton className="size-8 shrink-0 rounded-full md:size-7" />
              <div className="flex flex-1 flex-col gap-1">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-72 max-w-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 md:gap-1.5">
          {Array.from({ length: BUSINESS_OVERVIEW_LIST_SKELETON_PANELS }).map((_, index) => (
            <div key={index} className="flex flex-col gap-4 rounded-card bg-card p-5 md:gap-2 md:p-2.5">
              <SkeletonPanelHeading />
              {Array.from({ length: BUSINESS_OVERVIEW_LIST_SKELETON_ROWS }).map((_, row) => (
                <Skeleton key={row} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
      <StatGroupSkeleton
        tiles={BUSINESS_OVERVIEW_PERFORMANCE_SKELETON_TILES}
        gridClassName="grid-cols-2 lg:grid-cols-4"
        hasDetails
        prominent
      />
      <div className="grid gap-4 md:gap-1.5 lg:grid-cols-2">
        {Array.from({ length: BUSINESS_OVERVIEW_CHART_SKELETON_COUNT }).map((_, index) => (
          <div key={index} className="flex flex-col gap-4 rounded-card bg-card p-5 md:gap-2 md:p-2.5">
            <SkeletonPanelHeading />
            <Skeleton className="h-44 w-full rounded-md md:h-36" />
          </div>
        ))}
      </div>
    </SkeletonStatus>
  );
}
