import { Skeleton } from "@/components/ui/skeleton";
import {
  MATCH_VALIDATION_QUEUE_SKELETON_ACTIONS,
  MATCH_VALIDATION_SCAN_GRID_SKELETON_TILES,
} from "@/lib/constants/skeletons";
import { useTranslation } from "react-i18next";

function MatchValidationFigureSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex h-4 items-center">
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="aspect-[2.5/3.5] w-full rounded-lg" />
    </div>
  );
}

export function MatchValidationQueueSkeleton() {
  const { t } = useTranslation("common");
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4 md:gap-2">
      <span className="sr-only">{t("a11y.loading")}</span>
      <div className="flex flex-col gap-4 md:gap-2 md:flex-row md:items-start">
        <div className="grid w-full grid-cols-2 gap-3 md:max-w-xl">
          <MatchValidationFigureSkeleton />
          <MatchValidationFigureSkeleton />
        </div>
        <div className="flex flex-col gap-2 md:w-48">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-2/5" />
          <Skeleton className="h-3 w-3/5" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: MATCH_VALIDATION_QUEUE_SKELETON_ACTIONS }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-24 rounded-lg md:h-7" />
        ))}
      </div>
    </div>
  );
}

export function MatchValidationScanGridSkeleton() {
  const { t } = useTranslation("common");
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4 md:gap-2">
      <span className="sr-only">{t("a11y.loading")}</span>
      <Skeleton className="h-10 w-56 self-end rounded-lg md:h-7" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: MATCH_VALIDATION_SCAN_GRID_SKELETON_TILES }).map((_, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-card bg-card p-2">
            <div className="grid grid-cols-2 gap-1.5">
              <Skeleton className="aspect-[2.5/3.5] w-full rounded-md" />
              <Skeleton className="aspect-[2.5/3.5] w-full rounded-md" />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-4 w-16 rounded-sm" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
