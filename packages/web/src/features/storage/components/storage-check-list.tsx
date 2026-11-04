import { MobileStoragePickList } from "@/features/storage/components/mobile-storage-pick-list";
import { StoragePickListTable } from "@/features/storage/components/storage-pick-list-table";
import { useIsMobile } from "@/hooks/use-is-mobile";
import type { StorageCheckListProps } from "@/lib/interfaces/storage";

export function StorageCheckList({
  rows,
  checkedCount,
  total,
  progressLabel,
  showLocation,
  checkLabel,
  onCheckedChange,
}: StorageCheckListProps) {
  const isMobile = useIsMobile();
  const percentChecked =
    total > 0 ? Math.round((checkedCount / total) * 100) : 0;
  const rowsProps = { rows, showLocation, checkLabel, onCheckedChange };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-xs tabular-nums text-foreground/70">
          {progressLabel}
        </span>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={checkedCount}
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
            style={{ width: `${percentChecked}%` }}
          />
        </div>
      </div>
      {isMobile ? (
        <MobileStoragePickList {...rowsProps} />
      ) : (
        <StoragePickListTable {...rowsProps} />
      )}
    </div>
  );
}
