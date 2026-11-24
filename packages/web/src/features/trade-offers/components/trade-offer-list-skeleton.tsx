import { SkeletonStatus } from "@/components/skeleton-status";
import { Skeleton } from "@/components/ui/skeleton";
import { LIST_SKELETON_TITLE_WIDTH_CLASSES } from "@/lib/constants/skeletons";
import { TRADE_OFFERS_SKELETON_ROWS } from "@/lib/constants/trade-offers";
import type { TradeOfferListSkeletonProps } from "@/lib/interfaces/skeletons";
import { cn } from "@/lib/utils";

export function TradeOfferListSkeleton({ hasHeading = false }: TradeOfferListSkeletonProps) {
  return (
    <SkeletonStatus className="flex flex-col gap-2 md:gap-1.5">
      {hasHeading && <Skeleton className="h-3.5 w-20" />}
      <div className="flex flex-col divide-y divide-border overflow-hidden rounded-card bg-card">
        {Array.from({ length: TRADE_OFFERS_SKELETON_ROWS }).map((_, index) => (
          <div key={index} className="flex min-h-12 items-center gap-3 px-3 py-2 md:gap-2 md:px-2.5">
            <Skeleton className="size-4 shrink-0 rounded-sm" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton
                className={cn(
                  "h-3.5",
                  LIST_SKELETON_TITLE_WIDTH_CLASSES[index % LIST_SKELETON_TITLE_WIDTH_CLASSES.length],
                )}
              />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="size-4 shrink-0 rounded-sm" />
          </div>
        ))}
      </div>
    </SkeletonStatus>
  );
}
