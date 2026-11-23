import { Skeleton } from "@/components/ui/skeleton";
import { PickRowsSkeleton } from "@/features/business/components/pick-rows-skeleton";

export function PickWalkSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <div className="flex w-40 flex-col gap-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-1 w-full rounded-sm" />
        </div>
        <Skeleton className="h-7 w-72 max-w-full rounded-lg" />
      </div>
      <Skeleton className="h-3 w-2/3" />
      <div className="rounded-lg bg-card p-3 ring-1 ring-border max-md:p-4">
        <div className="flex items-start gap-3 max-md:gap-4">
          <Skeleton className="aspect-[2.5/3.5] w-16 shrink-0 rounded-sm md:w-24" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="mt-3 flex gap-1.5 max-md:flex-col">
          <Skeleton className="h-7 flex-1 rounded-lg max-md:h-10" />
          <Skeleton className="h-7 flex-1 rounded-lg max-md:h-10" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Skeleton className="size-4 shrink-0 rounded-full" />
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="ml-auto h-3 w-10" />
        </div>
        <PickRowsSkeleton hasSpotLine />
      </div>
    </div>
  );
}
