import { EmptyState } from "@/components/empty-state";
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
      {Array.from({ length: pendingLookupCount }).map((_, index) => (
        <Skeleton key={index} className="h-16 rounded-lg" />
      ))}
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
