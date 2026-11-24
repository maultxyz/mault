import { EmptyState } from "@/components/empty-state";
import { SkeletonStatus } from "@/components/skeleton-status";
import { Skeleton } from "@/components/ui/skeleton";
import { useScanRemoval } from "@/features/scanner/api/use-scan-removal";
import { ScanRemovalRow } from "@/features/scanner/components/scan-removal-row";
import type { ScanRemovalListProps } from "@/lib/interfaces/scan-removal";
import { cn } from "@/lib/utils";
import { IconScan } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ScanRemovalList({ className }: ScanRemovalListProps) {
  const { t } = useTranslation("scanner");
  const { entries, pendingLookupCount, selectEntryCopy, dropEntry } =
    useScanRemoval();

  if (entries.length === 0 && pendingLookupCount === 0) {
    return (
      <EmptyState
        icon={IconScan}
        size="compact"
        title={t("scanRemoval.emptyTitle")}
        description={t("scanRemoval.emptyDescription")}
        className={className}
      />
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {pendingLookupCount > 0 && (
        <SkeletonStatus className="flex flex-col gap-2">
          {Array.from({ length: pendingLookupCount }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-card bg-card p-2"
            >
              <Skeleton className="aspect-[2.5/3.5] w-10 shrink-0 rounded-sm" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-2/3 rounded-sm" />
                <Skeleton className="h-3 w-1/2 rounded-sm" />
                <Skeleton className="h-3 w-1/3 rounded-sm" />
              </div>
              <Skeleton className="size-7 shrink-0 rounded-lg max-md:size-10" />
            </div>
          ))}
        </SkeletonStatus>
      )}
      {entries.map((entry) => (
        <ScanRemovalRow
          key={entry.entryId}
          entry={entry}
          entries={entries}
          onSelectCopy={(scanId) => selectEntryCopy(entry.entryId, scanId)}
          onDrop={() => dropEntry(entry.entryId)}
        />
      ))}
    </div>
  );
}
