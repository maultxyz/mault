import { Skeleton } from "@/components/ui/skeleton";
import type { FormSkeletonProps } from "@/lib/interfaces/skeletons";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function FormSkeleton({ fields = 3, hasSubmit = false, className }: FormSkeletonProps) {
  const { t } = useTranslation("common");
  return (
    <div role="status" aria-busy="true" className={cn("flex flex-col gap-4 md:gap-3", className)}>
      <span className="sr-only">{t("a11y.loading")}</span>
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-11 w-full rounded-lg md:h-7" />
        </div>
      ))}
      {hasSubmit && <Skeleton className="h-10 w-28 self-end rounded-lg md:h-7" />}
    </div>
  );
}
