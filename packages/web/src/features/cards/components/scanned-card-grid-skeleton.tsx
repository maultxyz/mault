import { Skeleton } from "@/components/ui/skeleton";
import type { CardTileSkeletonGridProps } from "@/lib/interfaces/skeletons";
import { useTranslation } from "react-i18next";

export function ScannedCardGridSkeleton({
  count = 12,
  className,
}: CardTileSkeletonGridProps) {
  const { t } = useTranslation("common");
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{t("a11y.loading")}</span>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-card border-2 border-transparent bg-card p-1"
        >
          <Skeleton className="aspect-[2.5/3.5] w-full rounded-lg" />
          <div className="flex items-center justify-between gap-2 px-1 pb-1 pt-1">
            <div className="flex h-4 min-w-0 items-center gap-1.5">
              <Skeleton className="size-3 shrink-0 rounded-full" />
              <Skeleton className="h-3 w-8 rounded-sm" />
              <Skeleton className="h-3 w-6 rounded-sm" />
            </div>
            <Skeleton className="h-3 w-10 shrink-0 rounded-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}
