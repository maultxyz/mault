import { useStorageLocationDialogs } from "@/features/storage/api/use-storage-location-dialogs";
import { useStorageReviewStart } from "@/features/storage/api/use-storage-review-start";
import { StorageLocationDialogs } from "@/features/storage/components/storage-location-dialogs";
import { Callout } from "@/components/callout";
import { EmptyState } from "@/components/empty-state";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { ListSkeleton } from "@/components/list-skeleton";
import { MobileListRow } from "@/components/mobile-list-row";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { LibraryViewTabs } from "@/features/library/components/library-view-tabs";
import { MobileSearchInput } from "@/components/mobile-search-input";
import { Button } from "@/components/ui/button";
import { DrawerTitle } from "@/components/ui/drawer";
import {
  storageLocationUnreviewedCardsQueryOptions,
} from "@/features/storage/api/storage-locations";
import { MobileCardDrawer } from "@/features/cards/components/mobile-card-drawer";
import { ReviewGrid } from "@/features/cards/components/review-grid";
import { CARD_REVIEW_GRID_PARAM_VALUE } from "@/lib/constants/cards";
import { useQuery } from "@tanstack/react-query";
import { useStorageAccess } from "@/features/storage/api/use-storage-access";
import { useStorageLocations } from "@/features/storage/api/use-storage-locations";
import { useStorageLocationCardQuery } from "@/features/storage/api/use-storage-location-card-query";
import { StorageCardDetail } from "@/features/storage/components/storage-card-detail";
import { StorageExportMenu } from "@/features/storage/components/storage-export-menu";
import { ShareLinkTriggerButton } from "@/components/share-link-trigger-button";
import { ShareStorageLinkDialog } from "@/features/storage/components/share-storage-link-dialog";
import { StorageLocationActionsMenu } from "@/features/storage/components/storage-location-actions-menu";
import { StorageLocationContent } from "@/features/storage/components/storage-location-content";
import { StorageSearchResults } from "@/features/storage/components/storage-search-results";
import { StorageUpgradeNote } from "@/features/storage/components/storage-upgrade-note";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePriceSource } from "@/hooks/use-price-source";
import {
  MOBILE_CIRCLE_BUTTON_CLASS,
  MOBILE_LIST_CLASS,
  MOBILE_NAV_SCROLL_PADDING_CLASS,
  MOBILE_PAGE_BODY_CLASS,
  MOBILE_PILL_BUTTON_SM_CLASS,
  MOBILE_PRIMARY_CIRCLE_BUTTON_CLASS,
} from "@/lib/constants/nav";
import {
  STORAGE_CARD_SEARCH_PARAM,
  STORAGE_LOCATION_SEARCH_PARAM,
  STORAGE_PICK_LIST_PATH,
  STORAGE_REVIEW_SEARCH_PARAM,
  storageLabelsPath,
} from "@/lib/constants/storage";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import { writeStorageSelectionSearchParams } from "@/features/storage/lib/storage-search-params";
import type { StorageSelectionSearchParams } from "@/lib/interfaces/storage";
import { cn } from "@/lib/utils";
import {
  IconBox,
  IconEdit,
  IconListCheck,
  IconListSearch,
  IconPlus,
  IconPrinter,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

export function MobileStorage() {
  const { t } = useTranslation("storage");
  const { t: tCards } = useTranslation("cards");
  const { t: tHome } = useTranslation("home");
  const {
    locations,
    isLoading,
    isError,
    refetch,
    isMutating,
    create,
    rename,
    remove,
  } = useStorageLocations();
  const { formatCompact } = usePriceSource();
  const { isLocked } = useStorageAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const dialogState = useStorageLocationDialogs();
  const {
    setCreateOpen,
    setRenameOpen,
    setDeleteOpen,
    setShareOpen,
    setMenuLocation,
    openLocationAction,
  } = dialogState;
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(
    searchQuery.trim(),
    SEARCH_DEBOUNCE_MS,
  );
  const isSearching = searchQuery.trim().length > 0;

  const selectedGuid = searchParams.get(STORAGE_LOCATION_SEARCH_PARAM);
  const selected = locations.find((l) => l.guid === selectedGuid);
  const cardQuery = useStorageLocationCardQuery(selected?.guid);
  const openScanId = searchParams.get(STORAGE_CARD_SEARCH_PARAM);
  const [shownScanId, setShownScanId] = useState(openScanId);
  if (openScanId && openScanId !== shownScanId) setShownScanId(openScanId);
  const reviewParam = searchParams.get(STORAGE_REVIEW_SEARCH_PARAM);
  const isReviewing = reviewParam === "1";
  const isGridReviewing =
    !!selected && !openScanId && reviewParam === CARD_REVIEW_GRID_PARAM_VALUE;
  const reviewGridPage = useQuery(
    storageLocationUnreviewedCardsQueryOptions(selected?.guid, isGridReviewing),
  );

  const showSelection = useCallback(
    (
      selection: Omit<StorageSelectionSearchParams, "shownLocationGuid">,
    ) =>
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          writeStorageSelectionSearchParams(next, {
            ...selection,
            shownLocationGuid: selectedGuid,
          });
          return next;
        },
        { replace: true },
      ),
    [selectedGuid, setSearchParams],
  );

  const select = useCallback(
    (guid: string | null) => showSelection({ locationGuid: guid }),
    [showSelection],
  );

  const openCard = (guid: string, scanId: string, review = isReviewing) =>
    showSelection({
      locationGuid: guid,
      scanId,
      reviewParamValue: review ? "1" : null,
    });

  const closeCard = useCallback(() => {
    if (selected) select(selected.guid);
  }, [selected, select]);

  const { setReviewLayout, openReviewGrid, startReview } =
    useStorageReviewStart(selected, openCard);

  const dialogs = (
    <StorageLocationDialogs
      dialogs={dialogState}
      selected={selected}
      create={create}
      rename={rename}
      remove={remove}
      onSelectedDeleted={() => select(null)}
    />
  );

  if (selected && isGridReviewing) {
    return (
      <div
        data-scroll-root
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-y-auto",
          MOBILE_NAV_SCROLL_PADDING_CLASS,
        )}
      >
        <ReviewGrid
          cards={reviewGridPage.data?.cards ?? []}
          total={reviewGridPage.data?.total ?? 0}
          isLoading={reviewGridPage.isPending}
          isError={reviewGridPage.isError}
          onRetry={() => void reviewGridPage.refetch()}
          onOpenOneByOne={(card) => {
            setReviewLayout("single");
            openCard(selected.guid, card.scanId, true);
          }}
          onClose={closeCard}
        />
      </div>
    );
  }

  if (selected) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <MobilePageHeader
          title={selected.name}
          subtitle={t("page.summary", {
            count: selected.cardCount,
            value: formatCompact(selected.totalValue),
          })}
          onBack={() => select(null)}
          actions={
            !isLocked && (
              <>
                <Button
                  variant="ghost"
                  className={MOBILE_CIRCLE_BUTTON_CLASS}
                  aria-label={t("labels.printLabel")}
                  nativeButton={false}
                  render={<Link to={storageLabelsPath([selected.guid])} />}
                >
                  <IconPrinter />
                </Button>
                <ShareStorageLinkDialog
                  locationGuid={selected.guid}
                  renderTrigger={(activeLinkCount) => (
                    <ShareLinkTriggerButton
                      variant="ghost"
                      className={MOBILE_CIRCLE_BUTTON_CLASS}
                      label={t("shareLink.trigger")}
                      activeLinkCount={activeLinkCount}
                    />
                  )}
                />
                <Button
                  variant="ghost"
                  className={MOBILE_CIRCLE_BUTTON_CLASS}
                  aria-label={t("page.rename")}
                  disabled={isMutating}
                  onClick={() => {
                    setMenuLocation(null);
                    setRenameOpen(true);
                  }}
                >
                  <IconEdit />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  aria-label={t("page.delete")}
                  disabled={isMutating}
                  onClick={() => {
                    setMenuLocation(null);
                    setDeleteOpen(true);
                  }}
                >
                  <IconTrash />
                </Button>
              </>
            )
          }
        >
          {selected.cardCount > 0 && (
            <div className="flex gap-1.5">
              {!isLocked && (
                <Button
                  className={MOBILE_PILL_BUTTON_SM_CLASS}
                  onClick={() => void startReview()}
                >
                  <IconListCheck />
                  {t("review.start")}
                </Button>
              )}
              <StorageExportMenu location={selected} />
            </div>
          )}
        </MobilePageHeader>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto",
            MOBILE_NAV_SCROLL_PADDING_CLASS,
          )}
        >
          <div className={MOBILE_PAGE_BODY_CLASS}>
            <StorageLocationContent
              location={selected}
              cardQuery={cardQuery}
              onOpenCard={(entry) =>
                openCard(entry.locationGuid, entry.scanId, false)
              }
            />
          </div>
        </div>
        {dialogs}
        <MobileCardDrawer open={!!openScanId} onClose={closeCard}>
          <DrawerTitle className="sr-only">
            {tCards("cardDetailPanel.cardDetailsFallback")}
          </DrawerTitle>
          {shownScanId && (
            <div data-vaul-no-drag className="flex min-h-0 flex-1 flex-col">
              <StorageCardDetail
                key={shownScanId}
                location={selected}
                cardsQuery={cardQuery.cardsQuery}
                scanId={shownScanId}
                reviewMode={isReviewing}
                onNavigate={(scanId) => openCard(selected.guid, scanId)}
                onShowReviewGrid={openReviewGrid}
                onClose={closeCard}
              />
            </div>
          )}
        </MobileCardDrawer>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MobilePageHeader
        title={tHome("library.title")}
        actions={
          <>
            {locations.length > 0 && (
              <Button
                variant="ghost"
                className={MOBILE_CIRCLE_BUTTON_CLASS}
                aria-label={t("pickList.open")}
                nativeButton={false}
                render={<Link to={STORAGE_PICK_LIST_PATH} />}
              >
                <IconListSearch />
              </Button>
            )}
            {!isLocked && (
              <Button
                className={MOBILE_PRIMARY_CIRCLE_BUTTON_CLASS}
                aria-label={t("page.newLocation")}
                disabled={isMutating}
                onClick={() => setCreateOpen(true)}
              >
                <IconPlus />
              </Button>
            )}
          </>
        }
      >
        <LibraryViewTabs value="storage" />
        {!isLoading && locations.length > 0 && (
          <MobileSearchInput
            placeholder={t("search.placeholder")}
            aria-label={t("search.placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        )}
      </MobilePageHeader>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          MOBILE_NAV_SCROLL_PADDING_CLASS,
        )}
      >
        <div className={MOBILE_PAGE_BODY_CLASS}>
          {isLocked && (
            <Callout variant="info">
              {t(
                locations.length > 0
                  ? "upgrade.lockedWithLocations"
                  : "upgrade.locked",
              )}{" "}
              <StorageUpgradeNote />
            </Callout>
          )}
          {isLoading ? (
            <ListSkeleton />
          ) : isError && locations.length === 0 ? (
            <LoadErrorCallout
              message={t("page.loadFailed")}
              onRetry={refetch}
            />
          ) : locations.length === 0 ? (
            <EmptyState
              icon={IconBox}
              title={t("page.emptyTitle")}
              description={t("page.emptyDescription")}
            />
          ) : isSearching ? (
            debouncedQuery ? (
              <StorageSearchResults
                query={debouncedQuery}
                onOpenLocation={(guid) => {
                  setSearchQuery("");
                  select(guid);
                }}
                onOpenCard={(entry) => {
                  setSearchQuery("");
                  openCard(entry.locationGuid, entry.scanId, false);
                }}
              />
            ) : (
              <ListSkeleton />
            )
          ) : (
            <div className={MOBILE_LIST_CLASS}>
              {locations.map((location) => (
                <div key={location.guid} className="flex items-center gap-1">
                  <div className="min-w-0 flex-1">
                    <MobileListRow
                      icon={<IconBox />}
                      label={location.name}
                      description={t("page.summary", {
                        count: location.cardCount,
                        value: formatCompact(location.totalValue),
                      })}
                      onClick={() => select(location.guid)}
                    />
                  </div>
                  {!isLocked && (
                    <StorageLocationActionsMenu
                      location={location}
                      disabled={isMutating}
                      className="-mr-2 shrink-0"
                      onShare={(target) => openLocationAction(target, setShareOpen)}
                      onRename={(target) => openLocationAction(target, setRenameOpen)}
                      onDelete={(target) => openLocationAction(target, setDeleteOpen)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {dialogs}
    </div>
  );
}
