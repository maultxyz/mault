import { Skeleton } from "@/components/ui/skeleton";
import { BIN_LIST_SKELETON_PAIRED_CELLS } from "@/lib/constants/skeletons";
import type { BinCardSkeletonProps } from "@/lib/interfaces/skeletons";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

function BinCardSkeleton({ className }: BinCardSkeletonProps) {
  return (
    <div className={cn("flex flex-col gap-1 p-2 max-md:p-3", className)}>
      <div className="flex h-5 items-center justify-between gap-2 max-md:h-6">
        <Skeleton className="h-3.5 w-12" />
        <Skeleton className="h-4 w-14 rounded-sm" />
      </div>
      <div className="flex h-4 items-center max-md:h-5">
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

export function BinListSkeleton() {
  const { t } = useTranslation("common");
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-2">
      <span className="sr-only">{t("a11y.loading")}</span>
      <Skeleton className="h-7 w-full rounded-lg max-md:h-10" />
      <div className="grid grid-cols-2 overflow-hidden rounded-card bg-card">
        {Array.from({ length: BIN_LIST_SKELETON_PAIRED_CELLS }).map((_, index) => (
          <BinCardSkeleton
            key={index}
            className={cn(index >= 2 && "border-t", index % 2 === 0 && "border-r")}
          />
        ))}
        <BinCardSkeleton className="col-span-2 border-t" />
      </div>
    </div>
  );
}
