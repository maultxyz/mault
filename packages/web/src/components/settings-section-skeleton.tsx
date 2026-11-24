import { SkeletonStatus } from "@/components/skeleton-status";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  SettingsSectionSkeletonProps,
  SettingsSectionsSkeletonProps,
} from "@/lib/interfaces/skeletons";
import { cn } from "@/lib/utils";

export function SettingsSectionSkeleton({
  fields = 2,
  hasDescription = true,
  hasAction = false,
  hasFieldDescriptions = false,
  controlClassName,
  fieldGridClassName,
  children,
}: SettingsSectionSkeletonProps) {
  return (
    <div className="flex flex-col gap-4 rounded-card bg-card p-5 md:gap-2 md:p-2.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex h-5 items-center">
            <Skeleton className="h-3.5 w-40" />
          </div>
          {hasDescription && (
            <div className="flex h-5 items-center">
              <Skeleton className="h-3 w-3/4 max-w-md" />
            </div>
          )}
        </div>
        {hasAction && <Skeleton className="h-10 w-28 shrink-0 rounded-lg md:h-7" />}
      </div>
      {children ?? (
        <div className={cn("grid gap-4 md:gap-2", fieldGridClassName)}>
          {Array.from({ length: fields }).map((_, index) => (
            <div key={index} className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className={cn("h-11 w-full rounded-lg md:h-7", controlClassName)} />
              {hasFieldDescriptions && <Skeleton className="h-3 w-2/3" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SettingsSectionsSkeleton({ sections, className }: SettingsSectionsSkeletonProps) {
  return (
    <SkeletonStatus className={cn("flex flex-col gap-4 md:gap-2", className)}>
      {sections.map((section, index) => (
        <SettingsSectionSkeleton key={index} {...section} />
      ))}
    </SkeletonStatus>
  );
}
