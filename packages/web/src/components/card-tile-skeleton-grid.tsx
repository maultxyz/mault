import { Skeleton } from "@/components/ui/skeleton";
import type { CardTileSkeletonGridProps } from "@/lib/interfaces/skeletons";
import { cn } from "@/lib/utils";

export function CardTileSkeletonGrid({
  count = 8,
  className,
}: CardTileSkeletonGridProps) {
  return (
    <div className={cn("grid grid-cols-3 gap-2 sm:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="aspect-[2.5/3.5] w-full rounded-md" />
      ))}
    </div>
  );
}
