import { Skeleton } from "@/components/ui/skeleton";
import type { CardDetailSkeletonProps } from "@/lib/interfaces/skeletons";
import { cn } from "@/lib/utils";

export function CardDetailSkeleton({ className }: CardDetailSkeletonProps) {
  return (
    <div className={cn("flex flex-col gap-3 p-4", className)}>
      <Skeleton className="aspect-[2.5/3.5] w-40 rounded-lg" />
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
