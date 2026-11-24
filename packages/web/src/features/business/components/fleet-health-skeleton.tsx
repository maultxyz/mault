import { SkeletonStatus } from "@/components/skeleton-status";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FLEET_ALERT_SKELETON_ROWS,
  FLEET_DEVICE_SKELETON_COUNT,
} from "@/lib/constants/business";

export function FleetHealthSkeleton() {
  return (
    <SkeletonStatus className="flex flex-col gap-4 md:gap-2">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-64 max-w-full" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 md:gap-2 xl:grid-cols-3">
        {Array.from({ length: FLEET_DEVICE_SKELETON_COUNT }).map((_, index) => (
          <div key={index} className="flex flex-col gap-3 rounded-card bg-card p-4 md:gap-2 md:p-2.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="ml-auto h-5 w-16 rounded-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 2 }).map((_, cellIndex) => (
                <div key={cellIndex} className="flex flex-col gap-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
              <Skeleton className="h-2.5 w-28" />
            </div>
            <Skeleton className="h-7 w-full rounded-lg max-md:h-10" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.5 w-20" />
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-card bg-card">
          {Array.from({ length: FLEET_ALERT_SKELETON_ROWS }).map((_, index) => (
            <div key={index} className="flex flex-col gap-1.5 px-3 py-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-20 rounded-sm" />
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="ml-auto h-3 w-24" />
              </div>
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonStatus>
  );
}
