import { Skeleton } from "@/components/ui/skeleton";
import { SOUND_LIST_SKELETON_ROWS } from "@/lib/constants/skeletons";
import { useTranslation } from "react-i18next";

function IconButtonPairSkeleton() {
  return (
    <div className="flex shrink-0">
      <Skeleton className="size-10 rounded-l-lg rounded-r-none md:size-7" />
      <Skeleton className="size-10 rounded-l-none rounded-r-lg md:size-7" />
    </div>
  );
}

export function SoundClipListSkeleton() {
  const { t } = useTranslation("common");
  return (
    <div role="status" aria-busy="true" className="flex flex-col divide-y divide-border">
      <span className="sr-only">{t("a11y.loading")}</span>
      {Array.from({ length: SOUND_LIST_SKELETON_ROWS }).map((_, index) => (
        <div
          key={index}
          className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-1 px-3 py-2"
        >
          <div className="col-start-2 row-start-1 flex h-5 items-center">
            <Skeleton className="h-3.5 w-1/3" />
          </div>
          <Skeleton className="col-start-1 row-start-2 size-10 rounded-full" />
          <Skeleton className="col-start-2 row-start-2 h-8 w-full rounded-sm" />
          <Skeleton className="col-start-3 row-start-2 h-3.5 w-10" />
          <div className="col-start-4 row-start-2">
            <IconButtonPairSkeleton />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SoundRuleListSkeleton() {
  const { t } = useTranslation("common");
  return (
    <div role="status" aria-busy="true" className="flex flex-col divide-y divide-border">
      <span className="sr-only">{t("a11y.loading")}</span>
      {Array.from({ length: SOUND_LIST_SKELETON_ROWS }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-3 py-2">
          <div className="flex shrink-0 flex-col">
            <Skeleton className="size-10 rounded-t-lg rounded-b-none md:size-7" />
            <Skeleton className="size-10 rounded-t-none rounded-b-lg md:size-7" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-4 w-7 shrink-0 rounded-full max-md:h-6 max-md:w-10" />
          <IconButtonPairSkeleton />
        </div>
      ))}
    </div>
  );
}
