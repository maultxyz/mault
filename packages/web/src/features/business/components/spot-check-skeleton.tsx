import { SkeletonStatus } from "@/components/skeleton-status";
import { StatGroupSkeleton } from "@/components/stat-group-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function SpotCheckSkeleton() {
  return (
    <SkeletonStatus className="flex flex-col gap-4 md:gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Skeleton className="h-7 w-20 rounded-lg max-md:h-10" />
        <Skeleton className="mr-auto h-3.5 w-40" />
        <Skeleton className="h-5 w-14 rounded-sm" />
        <Skeleton className="h-7 w-20 rounded-lg max-md:h-10" />
      </div>
      <StatGroupSkeleton tiles={4} gridClassName="grid-cols-2 sm:grid-cols-4" />
      <div className="flex flex-col gap-3 rounded-card bg-card p-4 md:gap-2 md:p-2.5">
        <div className="flex items-center justify-between gap-1.5">
          <Skeleton className="size-7 rounded-lg max-md:size-10" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="size-7 rounded-lg max-md:size-10" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="aspect-[2.5/3.5] w-full rounded-md" />
            </div>
          ))}
        </div>
        <Skeleton className="h-3.5 w-2/3" />
        <div className="flex gap-1.5">
          <Skeleton className="h-7 flex-1 rounded-lg max-md:h-10" />
          <Skeleton className="h-7 flex-1 rounded-lg max-md:h-10" />
        </div>
      </div>
    </SkeletonStatus>
  );
}
