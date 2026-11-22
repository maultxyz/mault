import { Skeleton } from "@/components/ui/skeleton";

export function GlobalSearchSkeletonRow() {
  return (
    <div className="flex min-h-11 items-center gap-2.5 px-2.5 py-1.5 md:min-h-9">
      <Skeleton className="aspect-[2.5/3.5] w-8 shrink-0 rounded-sm md:w-7" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}
