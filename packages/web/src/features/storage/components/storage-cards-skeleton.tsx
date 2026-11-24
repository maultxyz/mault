import { MobileListSkeleton } from "@/components/mobile-list-skeleton";
import { SkeletonStatus } from "@/components/skeleton-status";
import { TableSkeleton } from "@/components/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { CARD_GRID_DENSITY_CLASS } from "@/lib/constants/card-grid";
import {
  STORAGE_CARD_TABLE_SKELETON_COLUMNS,
  STORAGE_CARDS_SKELETON_ROWS,
  STORAGE_CARDS_SKELETON_TILES,
} from "@/lib/constants/storage";
import type { StorageCardsSkeletonProps } from "@/lib/interfaces/skeletons";

export function StorageCardsSkeleton({ viewMode, density }: StorageCardsSkeletonProps) {
  const isMobile = useIsMobile();
  if (viewMode === "list" && isMobile) {
    return <MobileListSkeleton leading="thumbnail" hasTrailing rows={STORAGE_CARDS_SKELETON_ROWS} />;
  }
  if (viewMode === "list") {
    return (
      <SkeletonStatus>
        <TableSkeleton columns={STORAGE_CARD_TABLE_SKELETON_COLUMNS} rows={STORAGE_CARDS_SKELETON_ROWS} />
      </SkeletonStatus>
    );
  }
  return (
    <SkeletonStatus className="@container">
      <div className={CARD_GRID_DENSITY_CLASS[density]}>
        {Array.from({ length: STORAGE_CARDS_SKELETON_TILES }).map((_, index) => (
          <div key={index} className="flex flex-col gap-1.5 rounded-card border-2 border-transparent bg-card p-1">
            <Skeleton className="aspect-[2.5/3.5] w-full rounded-lg" />
            <Skeleton className="mx-1 h-3 w-3/4" />
            <div className="flex items-center justify-between gap-2 px-1 pb-1">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-3 w-8" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonStatus>
  );
}
