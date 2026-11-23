import { Skeleton } from "@/components/ui/skeleton";
import type { TableSkeletonProps } from "@/lib/interfaces/skeletons";
import { cn } from "@/lib/utils";

export function TableSkeleton({ columns, rows = 6, rowClassName }: TableSkeletonProps) {
  const row = (isHeader: boolean, rowIndex: number) => (
    <div
      key={rowIndex}
      className={cn(
        "flex items-center gap-4 border-b px-2 last:border-0",
        isHeader ? "h-7" : cn("min-h-8 py-1", rowClassName),
      )}
    >
      {columns.map((column, columnIndex) => (
        <div
          key={columnIndex}
          className={cn(
            "flex min-w-0 flex-1",
            column.alignsEnd && "justify-end",
            column.className,
          )}
        >
          {column.isThumbnail ? (
            !isHeader && <Skeleton className="aspect-[2.5/3.5] w-8 rounded-md" />
          ) : (
            <Skeleton className={cn(isHeader ? "h-2.5" : "h-3", column.barClassName)} />
          )}
        </div>
      ))}
    </div>
  );
  return (
    <div className="w-full overflow-hidden rounded-card border bg-card">
      {row(true, -1)}
      {Array.from({ length: rows }).map((_, rowIndex) => row(false, rowIndex))}
    </div>
  );
}
