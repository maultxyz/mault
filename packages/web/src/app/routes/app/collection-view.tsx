import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CardGrid } from "@/features/cards/components/card-grid";
import { ScannedCardGridSkeleton } from "@/features/cards/components/scanned-card-grid-skeleton";
import {
  clearUnmatchedScans,
  removeUnmatchedScan,
} from "@/features/collections/api/collections";
import { useCollections } from "@/features/collections/api/use-collections";
import { ViewedCollectionContext } from "@/features/collections/api/use-viewed-collection";
import { ShareMonitorLinkDialog } from "@/features/collections/components/share-monitor-link-dialog";
import { useUnmatchedView } from "@/features/scanner/api/use-unmatched-view";
import { UnmatchedCardsBrowser } from "@/features/scanner/components/unmatched-cards-browser";
import {
  COLLECTIONS_PATH,
  monitorCollectionPath,
} from "@/lib/constants/collections";
import { CARD_GRID_CLASS } from "@/lib/constants/card-grid";
import { PAGE_TITLE_CLASS } from "@/lib/constants/nav";
import { STATS_COLLECTION_PARAM, STATS_PATH } from "@/lib/constants/stats";
import { cn } from "@/lib/utils";
import {
  IconAlbum,
  IconArrowLeft,
  IconChartBar,
  IconHeartRateMonitor,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";

export default function CollectionViewPage() {
  const { t } = useTranslation("collections");
  const { collectionGuid } = useParams<{ collectionGuid: string }>();
  const { search } = useLocation();
  const {
    collections,
    activeCollection,
    isLoading,
    isActivating,
    activateCollection,
  } = useCollections();
  const collection =
    collections.find((candidate) => candidate.guid === collectionGuid) ?? null;
  const unmatchedView = useUnmatchedView();

  if (collectionGuid && collectionGuid === activeCollection?.guid) {
    return <Navigate to={{ pathname: "/app", search }} replace />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2 md:gap-x-1.5 md:px-3">
          <Skeleton className="size-10 shrink-0 rounded-lg md:size-7" />
          <div className="flex min-w-0 flex-1 basis-40 flex-col">
            <div className="flex h-7 items-center">
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="flex h-4 items-center">
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-10 w-28 rounded-lg md:h-7" />
          <Skeleton className="size-10 rounded-lg md:size-7" />
          <Skeleton className="h-10 w-24 rounded-lg md:h-7" />
          <Skeleton className="h-10 w-36 rounded-lg md:h-7" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-1.5 border-b p-2">
            <Skeleton className="h-11 flex-1 rounded-lg md:h-7" />
            <Skeleton className="h-11 w-full shrink-0 rounded-lg sm:w-64 md:h-7" />
            <Skeleton className="size-10 shrink-0 rounded-lg md:size-7" />
            <Skeleton className="size-10 shrink-0 rounded-lg md:size-7" />
            <Skeleton className="size-10 shrink-0 rounded-lg md:size-7" />
          </div>
          <div className="@container p-2">
            <ScannedCardGridSkeleton className={CARD_GRID_CLASS} />
          </div>
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <EmptyState
        className="flex-1"
        icon={IconAlbum}
        title={t("view.notFoundTitle")}
        titleAs="h1"
        description={t("view.notFoundDescription")}
        action={
          <Button
            variant="outline"
            render={<Link to={COLLECTIONS_PATH}>{t("view.back")}</Link>}
          />
        }
      />
    );
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2 md:gap-x-1.5 md:px-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("view.back")}
          render={
            <Link to={COLLECTIONS_PATH}>
              <IconArrowLeft />
            </Link>
          }
        />
        <div className="min-w-0 flex-1 basis-40">
          <h1 className={cn(PAGE_TITLE_CLASS, "truncate")}>{collection.name}</h1>
          <p className="text-xs text-foreground/70">{t("view.subtitle")}</p>
        </div>
        <Button
          variant="outline"
          render={
            <Link
              to={`${STATS_PATH}?${new URLSearchParams({ [STATS_COLLECTION_PARAM]: collection.guid })}`}
            >
              <IconChartBar />
              {t("page.viewStats")}
            </Link>
          }
        />
        <ShareMonitorLinkDialog collectionGuid={collection.guid} />
        <Button
          variant="outline"
          render={
            <Link to={monitorCollectionPath(collection.guid)}>
              <IconHeartRateMonitor />
              {t("page.liveView")}
            </Link>
          }
        />
        <Button
          variant="outline"
          disabled={isActivating}
          onClick={() => activateCollection(collection.guid)}
        >
          <IconPlayerPlay />
          {t("page.setActiveCollection")}
        </Button>
      </div>
      <section className="flex flex-1 min-h-0 flex-col overflow-y-auto @container">
        <ViewedCollectionContext value={collection}>
          {unmatchedView.isOpen ? (
            <UnmatchedCardsBrowser
              collectionGuid={collection.guid}
              openIndex={unmatchedView.openIndex}
              onOpenIndexChange={unmatchedView.setOpenIndex}
              canIdentify
              onRemove={(scanId) => removeUnmatchedScan(collection.guid, scanId)}
              onRemoveAll={() => clearUnmatchedScans(collection.guid)}
              onClose={unmatchedView.close}
              className="min-h-full"
            />
          ) : (
            <CardGrid />
          )}
        </ViewedCollectionContext>
      </section>
    </div>
  );
}
