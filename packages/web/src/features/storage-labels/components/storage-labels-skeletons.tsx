import { Skeleton } from "@/components/ui/skeleton";
import { STORAGE_LABEL_LOCATION_SKELETON_ROWS } from "@/lib/constants/skeletons";

export function StorageLabelOptionsFormSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-card bg-card p-4 md:gap-2 md:p-2">
      <div className="flex flex-col gap-1">
        <div className="flex h-5 items-center">
          <Skeleton className="h-3.5 w-32" />
        </div>
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="flex flex-col gap-3 md:gap-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-11 w-full rounded-lg md:h-7" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-10 w-20 rounded-lg md:h-7" />
        </div>
        <div className="grid gap-1 rounded-lg bg-foreground/6 p-2">
          {Array.from({ length: STORAGE_LABEL_LOCATION_SKELETON_ROWS }).map((_, index) => (
            <div key={index} className="flex h-7 items-center gap-2">
              <Skeleton className="size-4 shrink-0 rounded-sm" />
              <Skeleton className="h-3.5 w-2/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LabelSheetPreviewSkeleton() {
  return (
    <Skeleton className="mx-auto aspect-[8.5/11] w-full max-w-[215.9mm] rounded-none" />
  );
}
