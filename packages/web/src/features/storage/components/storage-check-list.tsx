import { Progress } from "@/components/ui/progress";
import { MobileStoragePickList } from "@/features/storage/components/mobile-storage-pick-list";
import { StoragePickListTable } from "@/features/storage/components/storage-pick-list-table";
import { useIsMobile } from "@/hooks/use-is-mobile";
import type { StorageCheckListProps } from "@/lib/interfaces/storage";
import { useId } from "react";

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
  const progressLabelId = useId();
  const rowsProps = { rows, showLocation, checkLabel, onCheckedChange };

  return (
    <div className="flex flex-col gap-3 md:gap-2">
      <div className="flex items-center gap-3">
        <span
          id={progressLabelId}
          className="shrink-0 text-xs tabular-nums text-foreground/70"
        >
          {progressLabel}
        </span>
        <Progress
          aria-labelledby={progressLabelId}
          value={checkedCount}
          max={total}
          className="flex-1"
        />
      </div>
      {isMobile ? (
        <MobileStoragePickList {...rowsProps} />
      ) : (
        <StoragePickListTable {...rowsProps} />
      )}
    </div>
  );
}
