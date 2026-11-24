import { Skeleton } from "@/components/ui/skeleton";
import { CardDrawerContext } from "@/lib/card-drawer-context";
import {
  CARD_DETAIL_ACTION_BAR_CLASS,
  CARD_DETAIL_ACTION_ROW_CLASS,
  CARD_DETAIL_BODY_COLUMNS_CLASS,
  CARD_DETAIL_IMAGE_WIDTH_CLASS,
  CARD_DETAIL_IMAGES_CLASS,
  CARD_DETAIL_SCROLL_CLASS,
  CARD_DETAIL_SECTIONS_CLASS,
  CARD_DETAIL_SKELETON_SECTION_COUNT,
  CARD_DETAIL_TOP_BAR_CLASS,
} from "@/lib/constants/cards";
import type { CardDetailBodySkeletonProps } from "@/lib/interfaces/cards";
import { cn } from "@/lib/utils";
import { useContext } from "react";
import { useTranslation } from "react-i18next";

export function CardDetailBodySkeleton({ imageCount }: CardDetailBodySkeletonProps) {
  const hasCaptions = imageCount > 1;
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-4 w-48 rounded-sm" />
        <Skeleton className="h-3.5 w-32 rounded-sm" />
      </div>
      <div className={cn("grid gap-6", CARD_DETAIL_BODY_COLUMNS_CLASS)}>
        <div className={CARD_DETAIL_IMAGES_CLASS}>
          {Array.from({ length: imageCount }, (_, image) => (
            <div key={image} className="flex min-w-0 flex-col gap-1.5">
              {hasCaptions && (
                <div
                  className={cn(
                    "flex min-h-7 items-center",
                    CARD_DETAIL_IMAGE_WIDTH_CLASS,
                  )}
                >
                  <Skeleton className="h-3 w-20 rounded-sm" />
                </div>
              )}
              <Skeleton
                className={cn(
                  "aspect-[2.5/3.5] rounded-lg",
                  CARD_DETAIL_IMAGE_WIDTH_CLASS,
                )}
              />
            </div>
          ))}
        </div>
        <div className={CARD_DETAIL_SECTIONS_CLASS}>
          {Array.from({ length: CARD_DETAIL_SKELETON_SECTION_COUNT }, (_, section) => (
            <div key={section} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-20 rounded-sm" />
              <Skeleton className="h-3.5 w-full rounded-sm" />
              <Skeleton className="h-3.5 w-2/3 rounded-sm" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function CardDetailPanelSkeleton() {
  const { t } = useTranslation("common");
  const inCardDrawer = useContext(CardDrawerContext);
  return (
    <div
      role="status"
      aria-busy="true"
      className="flex h-full min-h-0 flex-1 flex-col min-w-0"
    >
      <span className="sr-only">{t("a11y.loading")}</span>
      {!inCardDrawer && (
        <div className={CARD_DETAIL_TOP_BAR_CLASS}>
          <div className="flex shrink-0">
            <Skeleton className="size-7 rounded-l-lg rounded-r-none max-md:size-10" />
            <Skeleton className="size-7 rounded-l-none rounded-r-lg border-l border-background max-md:size-10" />
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-4 max-md:hidden">
            <Skeleton className="h-3 w-28 rounded-sm" />
            <Skeleton className="h-3 w-28 rounded-sm" />
          </div>
          <Skeleton className="size-7 shrink-0 rounded-lg max-md:size-10" />
          <Skeleton className="size-7 shrink-0 rounded-lg max-md:size-10" />
        </div>
      )}
      <div className={cn(CARD_DETAIL_SCROLL_CLASS, "overflow-hidden")}>
        <CardDetailBodySkeleton imageCount={2} />
      </div>
      {inCardDrawer ? (
        <div className="shrink-0 border-t p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-1.5">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="flex flex-1 justify-center">
              <Skeleton className="h-3 w-10 rounded-sm" />
            </div>
            <Skeleton className="size-10 shrink-0 rounded-lg" />
          </div>
        </div>
      ) : (
        <div className={CARD_DETAIL_ACTION_BAR_CLASS}>
          <div className={CARD_DETAIL_ACTION_ROW_CLASS}>
            <Skeleton className="h-7 w-28 rounded-lg max-md:h-10" />
            <Skeleton className="h-7 w-24 rounded-lg max-md:h-10" />
          </div>
        </div>
      )}
    </div>
  );
}
