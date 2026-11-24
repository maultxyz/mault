import { SkeletonStatus } from "@/components/skeleton-status";
import { StatGroupSkeleton } from "@/components/stat-group-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import type { BusinessDetailSkeletonProps } from "@/lib/interfaces/skeletons";

export function BusinessDetailSkeleton({
  statTiles,
  statGridClassName,
  children,
}: BusinessDetailSkeletonProps) {
  return (
    <SkeletonStatus className="flex flex-1 flex-col gap-4 md:gap-2">
      <div className="-mx-4 -mt-4 flex flex-wrap items-center gap-1.5 border-b p-2 pl-4 md:-mx-3 md:-mt-2 md:pl-3">
        <div className="mr-auto flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-14 rounded-sm" />
          </div>
          <Skeleton className="h-3 w-56 max-w-full" />
        </div>
        <Skeleton className="h-7 w-24 rounded-lg max-md:h-10" />
        <Skeleton className="size-7 rounded-lg max-md:size-10" />
      </div>
      <StatGroupSkeleton tiles={statTiles} gridClassName={statGridClassName} />
      {children}
    </SkeletonStatus>
  );
}
