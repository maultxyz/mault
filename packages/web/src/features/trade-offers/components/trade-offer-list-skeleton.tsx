import { SkeletonStatus } from "@/components/skeleton-status";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { LIST_SKELETON_TITLE_WIDTH_CLASSES } from "@/lib/constants/skeletons";
import { TRADE_OFFER_ROW_GRID_CLASS, TRADE_OFFERS_SKELETON_ROWS } from "@/lib/constants/trade-offers";
import type { TradeOfferListSkeletonProps } from "@/lib/interfaces/skeletons";
import { cn } from "@/lib/utils";

function TradeOfferSideSkeleton() {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Skeleton className="hidden h-10 w-12 shrink-0 rounded-sm lg:block" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Skeleton className="h-2.5 w-10" />
        <Skeleton className="h-3.5 w-14" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}

export function TradeOfferListSkeleton({ hasHeading = false }: TradeOfferListSkeletonProps) {
  const isMobile = useIsMobile();
  return (
    <SkeletonStatus className="flex flex-col gap-2 md:gap-1.5">
      {hasHeading && <Skeleton className="h-3.5 w-20" />}
      <div className="flex flex-col divide-y divide-border overflow-hidden rounded-card bg-card">
        {Array.from({ length: TRADE_OFFERS_SKELETON_ROWS }).map((_, index) => {
          const titleWidthClass =
            LIST_SKELETON_TITLE_WIDTH_CLASSES[index % LIST_SKELETON_TITLE_WIDTH_CLASSES.length];
          return isMobile ? (
            <div key={index} className="flex min-h-12 items-center gap-3 px-3 py-2">
              <Skeleton className="size-4 shrink-0 rounded-sm" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className={cn("h-3.5", titleWidthClass)} />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <Skeleton className="h-3.5 w-12" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="size-4 shrink-0 rounded-sm" />
            </div>
          ) : (
            <div key={index} className={cn(TRADE_OFFER_ROW_GRID_CLASS, "px-3 py-2.5")}>
              <div className="flex min-w-0 flex-col gap-1.5">
                <Skeleton className={cn("h-3.5", titleWidthClass)} />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <TradeOfferSideSkeleton />
              <TradeOfferSideSkeleton />
              <div className="flex items-center gap-2">
                <div className="flex flex-1 flex-col items-end gap-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="size-4 shrink-0 rounded-sm" />
              </div>
            </div>
          );
        })}
      </div>
    </SkeletonStatus>
  );
}
