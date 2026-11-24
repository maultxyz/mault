import { ListSkeleton } from "@/components/list-skeleton";
import { MOBILE_LIST_CLASS } from "@/lib/constants/nav";
import type { MobileListSkeletonProps } from "@/lib/interfaces/skeletons";
import { cn } from "@/lib/utils";

export function MobileListSkeleton({
  rows = 5,
  leading = "icon",
  hasSubtitle = true,
  hasTrailing = false,
  className,
  rowClassName,
}: MobileListSkeletonProps) {
  return (
    <ListSkeleton
      rows={rows}
      leading={leading}
      hasSubtitle={hasSubtitle}
      hasTrailing={hasTrailing}
      className={cn(MOBILE_LIST_CLASS, "gap-0", className)}
      rowClassName={cn("min-h-12 gap-3 py-2", rowClassName)}
    />
  );
}
