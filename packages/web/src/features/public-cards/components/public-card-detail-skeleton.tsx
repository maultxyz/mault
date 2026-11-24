import { SkeletonStatus } from "@/components/skeleton-status";
import { Skeleton } from "@/components/ui/skeleton";
import { PUBLIC_CARD_DETAIL_SKELETON_FIELD_ROWS } from "@/lib/constants/public-cards";

export function PublicCardDetailSkeleton() {
  return (
    <SkeletonStatus className="@container flex flex-col gap-5 md:gap-2">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-5 w-12 rounded-sm" />
        </div>
        <Skeleton className="h-3.5 w-32" />
      </div>
      <div className="grid gap-6 @3xl:grid-cols-[auto_minmax(0,1fr)]">
        <div className="flex flex-wrap items-start gap-3 @3xl:flex-col @6xl:flex-row max-md:grid max-md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="flex min-w-0 flex-col gap-1.5">
              <div className="flex h-6 items-center">
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="aspect-[2.5/3.5] w-56 rounded-lg max-md:w-full" />
            </div>
          ))}
        </div>
        <div className="flex min-w-0 flex-col gap-6 md:gap-2">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-16" />
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2">
              {Array.from({ length: PUBLIC_CARD_DETAIL_SKELETON_FIELD_ROWS }).map((_, index) => (
                <div key={index} className="contents">
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-3.5 w-40 max-w-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-6 max-md:grid max-md:grid-cols-2 max-md:gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3.5 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonStatus>
  );
}
