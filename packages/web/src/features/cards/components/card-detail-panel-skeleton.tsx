import { Skeleton } from "@/components/ui/skeleton";

export function CardDetailPanelSkeleton() {
  return (
    <div className="flex h-full flex-col min-h-0" aria-busy="true">
      <div className="flex items-center justify-between gap-2 border-b p-2">
        <div className="flex">
          <Skeleton className="size-7 rounded-l-md rounded-r-none" />
          <Skeleton className="size-7 rounded-l-none rounded-r-md border-l border-background" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-28 rounded-sm" />
          <Skeleton className="h-4 w-28 rounded-sm" />
          <Skeleton className="size-7 rounded-md" />
        </div>
      </div>
      <div className="@container flex-1 min-h-0 overflow-hidden p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-5 w-48 rounded-sm" />
          <Skeleton className="h-4 w-32 rounded-sm" />
        </div>
        <div className="grid gap-6 @3xl:grid-cols-[auto_minmax(0,1fr)]">
          <div className="flex flex-wrap gap-3 items-start @3xl:flex-col @6xl:flex-row">
            <Skeleton className="w-56 aspect-[2.5/3.5] rounded-lg" />
            <Skeleton className="w-56 aspect-[2.5/3.5] rounded-lg" />
          </div>
          <div className="flex flex-col gap-6 min-w-0">
            {[0, 1, 2].map((section) => (
              <div key={section} className="flex flex-col gap-2">
                <Skeleton className="h-3 w-20 rounded-sm" />
                <Skeleton className="h-4 w-full rounded-sm" />
                <Skeleton className="h-4 w-2/3 rounded-sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="shrink-0 border-t p-2 flex gap-2">
        <Skeleton className="h-7 w-28 rounded-md" />
        <Skeleton className="h-7 w-24 rounded-md" />
      </div>
    </div>
  );
}
