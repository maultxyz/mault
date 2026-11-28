import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
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
import { RarityGameKeyContext } from "@/lib/rarity-game-key-context";
import { ShareMonitorLinkDialog } from "@/features/collections/components/share-monitor-link-dialog";
import { useUnmatchedView } from "@/features/scanner/api/use-unmatched-view";
import { UnmatchedCardsBrowser } from "@/features/scanner/components/unmatched-cards-browser";
import { useLiveCollectionCardCaches } from "@/features/collections/api/use-live-collection-card-caches";
import { MobileCollectionView } from "@/features/collections/components/mobile-collection-view";
import { useSessionMonitor } from "@/features/scanner/api/use-session-monitor";
import { SessionErrorsPanel } from "@/features/scanner/components/session-errors-panel";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useCollectionLocks } from "@/lib/app-stream";
import {
  COLLECTIONS_PATH,
  collectionViewPath,
} from "@/lib/constants/collections";
import { MONITOR_OPEN_CARD_PARAM } from "@/lib/constants/scanner";
import { CARD_GRID_CLASS } from "@/lib/constants/card-grid";
import { STATS_COLLECTION_PARAM, STATS_PATH } from "@/lib/constants/stats";
import {
  IconAlbum,
  IconChartBar,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";

export default function CollectionViewPage() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileCollectionPage /> : <DesktopCollectionPage />;
}

function MobileCollectionPage() {
  const { collectionGuid, scanId } = useParams<{
    collectionGuid: string;
    scanId: string;
  }>();
  if (!collectionGuid) return <Navigate to={COLLECTIONS_PATH} replace />;
  if (scanId) {
    return (
      <Navigate
        to={{
          pathname: collectionViewPath(collectionGuid),
          search: `?${new URLSearchParams({ [MONITOR_OPEN_CARD_PARAM]: scanId })}`,
        }}
        replace
      />
    );
  }
  return <MobileCollectionView collectionGuid={collectionGuid} />;
}

function DesktopCollectionPage() {
  const { t } = useTranslation(["collections", "scanner"]);
  const { collectionGuid, scanId } = useParams<{
    collectionGuid: string;
    scanId: string;
  }>();
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
  const isActive = !!collectionGuid && collectionGuid === activeCollection?.guid;
  const session = useSessionMonitor(isActive ? undefined : collectionGuid);
  useLiveCollectionCardCaches(isActive ? undefined : collectionGuid, session);
  const { locks, currentUserId } = useCollectionLocks();
  const lock = collectionGuid ? locks[collectionGuid] : undefined;
  const otherViewers = session.viewers.filter(
    (viewer) => viewer.userId !== lock?.userId && viewer.userId !== currentUserId,
  );

  const searchParams = new URLSearchParams(search);
  const openScanIdParam = searchParams.get(MONITOR_OPEN_CARD_PARAM);
  searchParams.delete(MONITOR_OPEN_CARD_PARAM);
  const searchWithoutOpenCard = searchParams.size > 0 ? `?${searchParams}` : "";
  const openScanId = scanId ?? openScanIdParam;

  if (isActive) {
    return (
      <Navigate
        to={{
          pathname: openScanId ? `/app/cards/${openScanId}` : "/app",
          search: searchWithoutOpenCard,
        }}
        replace
      />
    );
  }

  if (collectionGuid && openScanIdParam) {
    return (
      <Navigate
        to={{
          pathname: `${collectionViewPath(collectionGuid)}/cards/${openScanIdParam}`,
          search: searchWithoutOpenCard,
        }}
        replace
      />
    );
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
      <PageHeader
        title={collection.name}
        description={t("view.subtitle")}
        backTo={COLLECTIONS_PATH}
        backLabel={t("view.back")}
        spansFullWidth
        actions={
          <>
            {lock && (
              <InitialsAvatar
                name={lock.displayName}
                variant="scanner"
                tooltip={t("scanner:isScanningTooltip", {
                  name: lock.displayName,
                })}
              />
            )}
            {otherViewers.map((viewer) => (
              <InitialsAvatar
                key={viewer.userId}
                name={viewer.displayName}
                variant="neutral"
                tooltip={t("scanner:monitorPage.isWatchingTooltip", {
                  name: viewer.displayName,
                })}
              />
            ))}
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
              disabled={isActivating}
              onClick={() => activateCollection(collection.guid)}
            >
              <IconPlayerPlay />
              {t("page.setActiveCollection")}
            </Button>
          </>
        }
      />
      {session.errors.length > 0 && (
        <div className="shrink-0 border-b p-2">
          <SessionErrorsPanel errors={session.errors} />
        </div>
      )}
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
            <RarityGameKeyContext value={collection.game?.key ?? null}>
              <CardGrid />
            </RarityGameKeyContext>
          )}
        </ViewedCollectionContext>
      </section>
    </div>
  );
}
