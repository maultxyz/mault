import { SkeletonStatus } from "@/components/skeleton-status";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MOBILE_LIST_CLASS } from "@/lib/constants/nav";
import { SHARE_LINK_LIST_SKELETON_ROWS } from "@/lib/constants/share-links";
import type { ShareLinkListSkeletonProps } from "@/lib/interfaces/skeletons";
import { cn } from "@/lib/utils";

export function ShareLinkListSkeleton({ leadsWithBadges = false }: ShareLinkListSkeletonProps) {
  const isMobile = useIsMobile();
  return (
    <SkeletonStatus
      className={
        isMobile
          ? MOBILE_LIST_CLASS
          : "flex flex-col divide-y divide-border rounded-lg bg-foreground/6"
      }
    >
      {Array.from({ length: SHARE_LINK_LIST_SKELETON_ROWS }).map((_, index) => (
        <div key={index} className={cn("flex items-center gap-3 py-2.5", !isMobile && "px-3")}>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {leadsWithBadges ? (
              <Skeleton className="h-5 w-16 rounded-sm" />
            ) : (
              <Skeleton className="h-3.5 w-2/5" />
            )}
            <Skeleton className="h-3 w-3/5" />
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Skeleton className="size-7 rounded-lg max-md:size-10" />
            <Skeleton className="h-7 w-16 rounded-lg max-md:h-10" />
          </div>
        </div>
      ))}
    </SkeletonStatus>
  );
}
