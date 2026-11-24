import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ValueHeroSkeleton() {
  return (
    <div className="flex flex-col gap-6 rounded-card bg-card p-6 md:gap-2 md:p-3">
      <div className="flex flex-col gap-1">
        <div className="flex h-5 items-center">
          <Skeleton className="h-3.5 w-28" />
        </div>
        <div className="flex h-10 items-center md:h-8">
          <Skeleton className="h-8 w-44 md:h-6 md:w-36" />
        </div>
      </div>
      <div className="grid grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className={cn("flex flex-col gap-1", index === 0 ? "pr-3" : "border-l px-3")}
          >
            <div className="flex h-7 items-center">
              <Skeleton className="h-5 w-12" />
            </div>
            <Skeleton className="h-2.5 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}
