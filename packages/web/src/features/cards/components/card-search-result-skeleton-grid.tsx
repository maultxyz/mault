import { Skeleton } from "@/components/ui/skeleton";
import type { CardTileSkeletonGridProps } from "@/lib/interfaces/skeletons";
import { cn } from "@/lib/utils";

export function CardSearchResultSkeletonGrid({
  count = 8,
  className,
}: CardTileSkeletonGridProps) {
  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-lg border bg-muted p-1">
          <Skeleton className="aspect-[2.5/3.5] w-full rounded-md" />
          <div className="flex flex-col gap-1.5 px-1 pt-1.5 pb-1">
            <Skeleton className="h-3 w-3/4 rounded-sm" />
            <div className="flex items-center gap-1.5">
              <Skeleton className="size-3 shrink-0 rounded-full" />
              <Skeleton className="h-3 w-8 rounded-sm" />
              <Skeleton className="h-3 w-6 rounded-sm" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
