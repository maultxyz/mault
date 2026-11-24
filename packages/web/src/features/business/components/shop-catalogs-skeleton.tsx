import { SkeletonStatus } from "@/components/skeleton-status";
import { Skeleton } from "@/components/ui/skeleton";
import { SHOP_CATALOG_SKELETON_ROWS } from "@/lib/constants/business";

export function ShopCatalogsSkeleton() {
  return (
    <SkeletonStatus className="flex flex-col divide-y divide-border">
      {Array.from({ length: SHOP_CATALOG_SKELETON_ROWS }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 py-2.5 first:pt-0 md:items-start md:px-3 md:first:pt-2.5"
        >
          <Skeleton className="size-4 shrink-0 rounded-sm md:mt-0.5" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-5 w-14 rounded-sm" />
            </div>
            <Skeleton className="h-3 w-3/5" />
          </div>
          <div className="flex shrink-0 gap-1.5">
            <Skeleton className="h-7 w-24 rounded-lg max-md:size-10" />
            <Skeleton className="size-7 rounded-lg max-md:size-10" />
          </div>
        </div>
      ))}
    </SkeletonStatus>
  );
}
