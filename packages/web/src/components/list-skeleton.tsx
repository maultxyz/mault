import { Skeleton } from "@/components/ui/skeleton";
import type { ListSkeletonProps } from "@/lib/interfaces/skeletons";
import { cn } from "@/lib/utils";

export function ListSkeleton({ rows = 4, className }: ListSkeletonProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-8 w-full" />
      ))}
    </div>
  );
}
