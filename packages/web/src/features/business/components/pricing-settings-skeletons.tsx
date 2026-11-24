import { Skeleton } from "@/components/ui/skeleton";
import { BUYLIST_TIER_SKELETON_ROWS } from "@/lib/constants/skeletons";

function FieldPairSkeleton() {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-11 w-full rounded-lg md:h-7" />
    </div>
  );
}

export function SellPriceSettingsSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:gap-2">
      <div className="flex flex-wrap items-start gap-4 md:gap-3">
        <div className="w-40">
          <FieldPairSkeleton />
        </div>
        <div className="w-64 max-w-full">
          <FieldPairSkeleton />
        </div>
      </div>
      <Skeleton className="h-3 w-2/3" />
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function BuylistSettingsSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:gap-2">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.5 w-24" />
        <div className="divide-y divide-border">
          {Array.from({ length: BUYLIST_TIER_SKELETON_ROWS }).map((_, index) => (
            <div
              key={index}
              className="flex items-end gap-2 py-2.5 first:pt-0 md:gap-3 md:px-3 md:py-2 md:first:pt-2"
            >
              <FieldPairSkeleton />
              <FieldPairSkeleton />
              <Skeleton className="size-10 shrink-0 rounded-lg md:size-7" />
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-24 rounded-lg md:h-7" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 md:gap-2">
        <FieldPairSkeleton />
        <FieldPairSkeleton />
        <FieldPairSkeleton />
      </div>
    </div>
  );
}
