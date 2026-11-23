import { SkeletonStatus } from "@/components/skeleton-status";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DIVIDED_ROWS_SKELETON_DEFAULT_LINES,
  LIST_SKELETON_SUBTITLE_WIDTH_CLASSES,
  LIST_SKELETON_TITLE_WIDTH_CLASSES,
} from "@/lib/constants/skeletons";
import type {
  DividedRowSkeletonLine,
  DividedRowSkeletonTrailing,
  DividedRowsSkeletonProps,
} from "@/lib/interfaces/skeletons";
import { cn } from "@/lib/utils";

function skeletonLine(line: DividedRowSkeletonLine, index: number, hasTitleBadge: boolean) {
  const titleWidth = LIST_SKELETON_TITLE_WIDTH_CLASSES[index % LIST_SKELETON_TITLE_WIDTH_CLASSES.length];
  const subtitleWidth =
    LIST_SKELETON_SUBTITLE_WIDTH_CLASSES[index % LIST_SKELETON_SUBTITLE_WIDTH_CLASSES.length];
  if (line === "title") {
    return (
      <div key={line} className="flex h-5 items-center gap-2">
        <Skeleton className={cn("h-3.5", titleWidth)} />
        {hasTitleBadge && <Skeleton className="h-4 w-12 shrink-0 rounded-sm" />}
      </div>
    );
  }
  if (line === "badges") {
    return (
      <div key={line} className="flex gap-1">
        <Skeleton className="h-4 w-14 rounded-sm" />
        <Skeleton className="h-4 w-16 rounded-sm" />
      </div>
    );
  }
  return (
    <div key={line} className="flex h-4 items-center">
      <Skeleton className={cn(line === "detail" ? "h-2.5 w-1/4" : "h-3", line === "subtitle" && subtitleWidth)} />
    </div>
  );
}

function skeletonTrailing(trailing: DividedRowSkeletonTrailing, index: number) {
  if (trailing === "iconButton") {
    return <Skeleton key={index} className="size-10 shrink-0 rounded-lg md:size-7" />;
  }
  if (trailing === "select") {
    return <Skeleton key={index} className="h-10 w-28 shrink-0 rounded-lg md:h-7" />;
  }
  if (trailing === "badge") {
    return <Skeleton key={index} className="h-4 w-14 shrink-0 rounded-sm" />;
  }
  if (trailing === "text") {
    return <Skeleton key={index} className="h-3 w-16 shrink-0" />;
  }
  return <Skeleton key={index} className="h-10 w-16 shrink-0 rounded-lg md:h-7" />;
}

export function DividedRowsSkeleton({
  rows = 3,
  leading = "glyph",
  lines = DIVIDED_ROWS_SKELETON_DEFAULT_LINES,
  hasTitleBadge = false,
  trailing = ["button"],
  rowClassName = "px-3 py-2.5",
  className,
}: DividedRowsSkeletonProps) {
  return (
    <SkeletonStatus className={cn("flex flex-col divide-y divide-border", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className={cn("flex items-center gap-3", rowClassName)}>
          {leading === "glyph" && <Skeleton className="size-4 shrink-0 rounded-sm" />}
          {leading === "icon" && <Skeleton className="size-8 shrink-0 rounded-full" />}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {lines.map((line) => skeletonLine(line, index, hasTitleBadge))}
          </div>
          {trailing.length > 0 && (
            <div className="flex shrink-0 items-center gap-1.5">
              {trailing.map((item, trailingIndex) => skeletonTrailing(item, trailingIndex))}
            </div>
          )}
        </div>
      ))}
    </SkeletonStatus>
  );
}
