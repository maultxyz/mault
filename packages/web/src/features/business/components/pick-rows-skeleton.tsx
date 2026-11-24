import { Skeleton } from "@/components/ui/skeleton";
import { LIST_SKELETON_TITLE_WIDTH_CLASSES } from "@/lib/constants/skeletons";
import { PICK_SKELETON_ROWS } from "@/lib/constants/business";
import type { PickRowsSkeletonProps } from "@/lib/interfaces/skeletons";
import { cn } from "@/lib/utils";

export function PickRowsSkeleton({ rows = PICK_SKELETON_ROWS, hasSpotLine = false }: PickRowsSkeletonProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg ring-1 ring-border">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-2.5 p-2 max-md:min-h-14 max-md:gap-3 max-md:p-3">
          <Skeleton className="size-4 shrink-0 rounded-full" />
          <Skeleton className="aspect-[2.5/3.5] w-10 shrink-0 rounded-sm" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton
              className={cn(
                "h-3.5",
                LIST_SKELETON_TITLE_WIDTH_CLASSES[index % LIST_SKELETON_TITLE_WIDTH_CLASSES.length],
              )}
            />
            {hasSpotLine && <Skeleton className="h-3 w-20" />}
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
