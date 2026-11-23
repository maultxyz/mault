import { Skeleton } from "@/components/ui/skeleton";
import type { CardSearchResultSkeletonGridProps } from "@/lib/interfaces/skeletons";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function CardSearchResultSkeletonGrid({
  count = 9,
  isReviewLayout = false,
  className,
}: CardSearchResultSkeletonGridProps) {
  const { t } = useTranslation("common");
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn("grid grid-cols-3 gap-2", className)}
    >
      <span className="sr-only">{t("a11y.loading")}</span>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex min-w-0 flex-col rounded-lg bg-foreground/6 p-1.5">
          <Skeleton className="aspect-[2.5/3.5] w-full rounded-lg" />
          {isReviewLayout ? (
            <div className="flex min-w-0 flex-col gap-0.5 px-1 pt-1.5 pb-0.5">
              <div className="flex h-4 items-center">
                <Skeleton className="h-3 w-3/4 rounded-sm" />
              </div>
              <div className="flex h-4 items-center">
                <Skeleton className="h-3 w-1/2 rounded-sm" />
              </div>
              <div className="flex h-4 items-center gap-1.5">
                <Skeleton className="size-2 shrink-0 rounded-full" />
                <Skeleton className="h-3 w-14 rounded-sm" />
                <Skeleton className="ml-auto h-3 w-8 rounded-sm" />
              </div>
            </div>
          ) : (
            <div className="flex min-w-0 flex-col gap-0.5 px-1 pt-1 pb-0.5">
              <div className="flex h-4 items-center">
                <Skeleton className="h-3 w-3/4 rounded-sm" />
              </div>
              <div className="flex h-4 items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Skeleton className="size-3 shrink-0 rounded-full" />
                  <Skeleton className="h-3 w-8 rounded-sm" />
                  <Skeleton className="h-3 w-6 rounded-sm" />
                </div>
                <Skeleton className="h-3 w-8 shrink-0 rounded-sm" />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
