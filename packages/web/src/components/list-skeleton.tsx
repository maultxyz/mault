import { Skeleton } from "@/components/ui/skeleton";
import type { ListSkeletonProps } from "@/lib/interfaces/skeletons";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function ListSkeleton({ rows = 4, className }: ListSkeletonProps) {
  const { t } = useTranslation("common");
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn("flex flex-col gap-1.5", className)}
    >
      <span className="sr-only">{t("a11y.loading")}</span>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-8 w-full" />
      ))}
    </div>
  );
}
