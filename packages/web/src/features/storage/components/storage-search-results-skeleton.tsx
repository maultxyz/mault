import { MobileListSkeleton } from "@/components/mobile-list-skeleton";
import { SkeletonStatus } from "@/components/skeleton-status";
import { TableSkeleton } from "@/components/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  STORAGE_CARDS_SKELETON_ROWS,
  STORAGE_SEARCH_TABLE_SKELETON_COLUMNS,
} from "@/lib/constants/storage";

export function StorageSearchResultsSkeleton() {
  const isMobile = useIsMobile();
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <Skeleton className="h-3 w-24" />
      {isMobile ? (
        <MobileListSkeleton leading="thumbnail" hasTrailing rows={STORAGE_CARDS_SKELETON_ROWS} />
      ) : (
        <SkeletonStatus>
          <TableSkeleton
            columns={STORAGE_SEARCH_TABLE_SKELETON_COLUMNS}
            rows={STORAGE_CARDS_SKELETON_ROWS}
          />
        </SkeletonStatus>
      )}
    </div>
  );
}
