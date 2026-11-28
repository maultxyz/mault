import { Skeleton } from "@/components/ui/skeleton";
import type { StatGroupSkeletonProps } from "@/lib/interfaces/skeletons";
import { cn } from "@/lib/utils";

export function StatGroupSkeleton({
  tiles,
  gridClassName = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  hasIcons = false,
  hasDetails = false,
  prominent = false,
}: StatGroupSkeletonProps) {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-32 md:h-3.5" />
      <div className={cn("grid gap-2", gridClassName)}>
        {Array.from({ length: tiles }).map((_, index) => (
          <div key={index} className="flex flex-col items-start gap-2 rounded-card bg-card p-3 md:gap-1.5 md:p-2">
            {hasIcons && <Skeleton className="mb-1 size-8 rounded-full md:mb-0.5 md:size-7" />}
            <Skeleton className="h-3 w-16" />
            <Skeleton className={prominent ? "h-7 w-20 md:h-6" : "h-5 w-12 md:h-4"} />
            {hasDetails && <Skeleton className="h-2.5 w-20" />}
          </div>
        ))}
      </div>
    </div>
  );
}
