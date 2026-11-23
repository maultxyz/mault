import { Skeleton } from "@/components/ui/skeleton";
import {
  LIST_SKELETON_SUBTITLE_WIDTH_CLASSES,
  LIST_SKELETON_TITLE_WIDTH_CLASSES,
} from "@/lib/constants/skeletons";
import type { ListSkeletonProps } from "@/lib/interfaces/skeletons";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function ListSkeleton({
  rows = 4,
  leading = "none",
  hasSubtitle = false,
  hasTrailing = false,
  className,
  rowClassName,
}: ListSkeletonProps) {
  const { t } = useTranslation("common");
  const isPlainBars = leading === "none" && !hasSubtitle && !hasTrailing;
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn("flex flex-col gap-1.5", className)}
    >
      <span className="sr-only">{t("a11y.loading")}</span>
      {Array.from({ length: rows }).map((_, index) =>
        isPlainBars ? (
          <Skeleton key={index} className={cn("h-8 w-full", rowClassName)} />
        ) : (
          <div key={index} className={cn("flex items-center gap-2.5 py-1", rowClassName)}>
            {leading === "icon" && <Skeleton className="size-8 shrink-0 rounded-full" />}
            {leading === "thumbnail" && (
              <Skeleton className="aspect-[2.5/3.5] w-9 shrink-0 rounded-sm" />
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton
                className={cn(
                  "h-3.5",
                  LIST_SKELETON_TITLE_WIDTH_CLASSES[index % LIST_SKELETON_TITLE_WIDTH_CLASSES.length],
                )}
              />
              {hasSubtitle && (
                <Skeleton
                  className={cn(
                    "h-3",
                    LIST_SKELETON_SUBTITLE_WIDTH_CLASSES[index % LIST_SKELETON_SUBTITLE_WIDTH_CLASSES.length],
                  )}
                />
              )}
            </div>
            {hasTrailing && <Skeleton className="h-3.5 w-12 shrink-0" />}
          </div>
        ),
      )}
    </div>
  );
}
