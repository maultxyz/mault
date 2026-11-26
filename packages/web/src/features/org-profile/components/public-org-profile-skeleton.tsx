import { SkeletonStatus } from "@/components/skeleton-status";
import { Skeleton } from "@/components/ui/skeleton";
import { MAIN_CONTENT_ID } from "@/lib/constants/a11y";
import { CARD_GRID_CLASS } from "@/lib/constants/card-grid";
import {
  ORG_PROFILE_SKELETON_LINK_COUNT,
  ORG_PROFILE_SKELETON_SHOWCASE_COUNT,
} from "@/lib/constants/org-profile";

export function PublicOrgProfileShowcaseSkeleton() {
  return (
    <div className={CARD_GRID_CLASS}>
      {Array.from({ length: ORG_PROFILE_SKELETON_SHOWCASE_COUNT }, (_, index) => (
        <div key={index} className="flex flex-col gap-1.5">
          <Skeleton className="aspect-[2.5/3.5] w-full rounded-lg" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export function PublicOrgProfileSkeleton() {
  return (
    <main
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className="flex min-h-dvh flex-col bg-background outline-none"
    >
      <SkeletonStatus className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 md:gap-5 md:py-10">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="size-24 rounded-full" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-full max-w-sm" />
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: ORG_PROFILE_SKELETON_LINK_COUNT }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-lg" />
          ))}
        </div>
        <div className="@container flex flex-col gap-3">
          <Skeleton className="h-4 w-32" />
          <PublicOrgProfileShowcaseSkeleton />
        </div>
      </SkeletonStatus>
    </main>
  );
}
