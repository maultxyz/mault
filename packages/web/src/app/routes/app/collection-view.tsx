import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CardGrid } from "@/features/cards/components/card-grid";
import { useCollections } from "@/features/collections/api/use-collections";
import { ViewedCollectionContext } from "@/features/collections/api/use-viewed-collection";
import { ShareMonitorLinkDialog } from "@/features/collections/components/share-monitor-link-dialog";
import {
  COLLECTIONS_PATH,
  monitorCollectionPath,
} from "@/lib/constants/collections";
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
import { Link, Navigate, useParams } from "react-router-dom";

export default function CollectionViewPage() {
  const { t } = useTranslation("collections");
  const { collectionGuid } = useParams<{ collectionGuid: string }>();
  const {
    collections,
    activeCollection,
    isLoading,
    isActivating,
    activateCollection,
  } = useCollections();
  const collection =
    collections.find((candidate) => candidate.guid === collectionGuid) ?? null;

  if (collectionGuid && collectionGuid === activeCollection?.guid) {
    return <Navigate to="/app" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 border-b px-4 py-2 md:gap-1.5 md:px-3">
        <Skeleton className="size-10 rounded-lg md:size-7" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-3 w-64" />
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
          <CardGrid />
        </ViewedCollectionContext>
      </section>
    </div>
  );
}
