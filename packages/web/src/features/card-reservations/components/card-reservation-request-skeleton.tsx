import { SkeletonStatus } from "@/components/skeleton-status";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CARD_RESERVATION_REQUEST_SKELETON_CARD_COUNT,
  CARD_RESERVATION_REQUEST_SKELETON_COUNT,
} from "@/lib/constants/card-reservations";
import type { CardReservationRequestSkeletonProps } from "@/lib/interfaces/skeletons";

export function CardReservationRequestSkeleton({
  requests = CARD_RESERVATION_REQUEST_SKELETON_COUNT,
  cardsPerRequest = CARD_RESERVATION_REQUEST_SKELETON_CARD_COUNT,
}: CardReservationRequestSkeletonProps) {
  return (
    <SkeletonStatus className="flex flex-col gap-2 md:gap-1.5">
      <Skeleton className="h-3.5 w-28" />
      {Array.from({ length: requests }).map((_, requestIndex) => (
        <div key={requestIndex} className="flex flex-col gap-2 rounded-card bg-card p-3 md:p-2.5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-5 w-14 rounded-sm" />
              </div>
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-3 w-24 shrink-0" />
          </div>
          <div className="flex flex-col divide-y divide-border">
            {Array.from({ length: cardsPerRequest }).map((_, cardIndex) => (
              <div key={cardIndex} className="flex items-start gap-2 py-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Skeleton className="aspect-[2.5/3.5] w-8 shrink-0 rounded-sm" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Skeleton className="h-3 w-2/5" />
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-5 w-10 rounded-sm" />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Skeleton className="h-5 w-20 rounded-sm" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </SkeletonStatus>
  );
}
