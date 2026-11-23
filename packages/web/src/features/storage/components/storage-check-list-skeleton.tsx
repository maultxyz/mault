import { MobileListSkeleton } from "@/components/mobile-list-skeleton";
import { SkeletonStatus } from "@/components/skeleton-status";
import { TableSkeleton } from "@/components/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  STORAGE_CARDS_SKELETON_ROWS,
  STORAGE_CHECK_LIST_SKELETON_COLUMNS,
  STORAGE_SEARCH_TABLE_SKELETON_COLUMNS,
} from "@/lib/constants/storage";
import type { StorageCheckListSkeletonProps } from "@/lib/interfaces/skeletons";

export function StorageCheckListSkeleton({ showLocation }: StorageCheckListSkeletonProps) {
  const isMobile = useIsMobile();
  const columns = showLocation
    ? [
        STORAGE_CHECK_LIST_SKELETON_COLUMNS[0],
        STORAGE_SEARCH_TABLE_SKELETON_COLUMNS[0],
        ...STORAGE_CHECK_LIST_SKELETON_COLUMNS.slice(1),
      ]
    : STORAGE_CHECK_LIST_SKELETON_COLUMNS;
  return (
    <div className="flex flex-col gap-3 md:gap-2">
      <div className="flex items-center gap-3">
        <Skeleton className="h-3 w-24 shrink-0" />
        <Skeleton className="h-1.5 flex-1 rounded-full" />
      </div>
      {isMobile ? (
        <MobileListSkeleton leading="thumbnail" rows={STORAGE_CARDS_SKELETON_ROWS} />
      ) : (
        <SkeletonStatus>
          <TableSkeleton columns={columns} rows={STORAGE_CARDS_SKELETON_ROWS} />
        </SkeletonStatus>
      )}
    </div>
  );
}
