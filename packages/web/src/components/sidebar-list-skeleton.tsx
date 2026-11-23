import { SkeletonStatus } from "@/components/skeleton-status";
import { Skeleton } from "@/components/ui/skeleton";
import { LIST_SKELETON_TITLE_WIDTH_CLASSES } from "@/lib/constants/skeletons";
import type { SidebarListSkeletonProps } from "@/lib/interfaces/skeletons";
import { cn } from "@/lib/utils";

export function SidebarListSkeleton({ rows = 5, className }: SidebarListSkeletonProps) {
  return (
    <SkeletonStatus className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex flex-col gap-1.5 p-2 max-md:gap-2 max-md:p-3">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <Skeleton
                className={cn(
                  "h-3.5",
                  LIST_SKELETON_TITLE_WIDTH_CLASSES[index % LIST_SKELETON_TITLE_WIDTH_CLASSES.length],
                )}
              />
            </div>
            <Skeleton className="h-5 w-14 shrink-0 rounded-sm" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-10 shrink-0" />
          </div>
        </div>
      ))}
    </SkeletonStatus>
  );
}
