import { SkeletonStatus } from "@/components/skeleton-status";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LIST_SKELETON_TITLE_WIDTH_CLASSES,
  TRADE_OFFER_DETAIL_SKELETON_ROWS,
} from "@/lib/constants/skeletons";
import type {
  TradeOfferDetailSkeletonProps,
  TradeOfferSideSkeletonProps,
} from "@/lib/interfaces/skeletons";
import { cn } from "@/lib/utils";

function TradeOfferSideSkeleton({ className }: TradeOfferSideSkeletonProps) {
  return (
    <div className={cn("flex flex-col gap-2 rounded-card bg-card p-3 md:p-2.5", className)}>
      <div className="flex flex-col gap-0.5">
        <div className="flex h-5 items-center">
          <Skeleton className="h-3.5 w-32" />
        </div>
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="flex flex-col divide-y divide-border">
        {Array.from({ length: TRADE_OFFER_DETAIL_SKELETON_ROWS }).map((_, index) => (
          <div key={index} className="flex items-start gap-2 py-2 md:py-1.5">
            <Skeleton className="aspect-[2.5/3.5] w-11 shrink-0 rounded-sm md:w-9" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Skeleton
                className={cn(
                  "h-3.5",
                  LIST_SKELETON_TITLE_WIDTH_CLASSES[index % LIST_SKELETON_TITLE_WIDTH_CLASSES.length],
                )}
              />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-4 w-10 rounded-sm" />
            </div>
            <Skeleton className="h-3.5 w-12 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TradeOfferDetailSkeleton({ hasValueSummary = true }: TradeOfferDetailSkeletonProps) {
  return (
    <SkeletonStatus className="flex flex-col gap-5 md:gap-2">
      <div className="flex flex-col gap-3 md:gap-2">
        <div className="flex flex-col gap-2 rounded-card bg-card p-3 md:p-2.5">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="contents">
                <div className="flex h-4 items-center md:h-5">
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="flex h-4 items-center md:h-5">
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="h-4 w-20 rounded-sm" />
        </div>
        {hasValueSummary && (
          <div className="flex flex-col gap-1 rounded-lg bg-foreground/6 p-3">
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="flex flex-col gap-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
            <Skeleton className="h-3.5 w-1/2" />
          </div>
        )}
      </div>
      <Skeleton className="h-10 w-full md:hidden" />
      <div className="grid items-start gap-3 md:grid-cols-2 md:gap-2">
        <TradeOfferSideSkeleton />
        <TradeOfferSideSkeleton className="max-md:hidden" />
      </div>
    </SkeletonStatus>
  );
}
