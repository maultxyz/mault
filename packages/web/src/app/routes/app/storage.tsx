import { cn } from "@/lib/utils";
import { PAGE_TITLE_CLASS } from "@/lib/constants/nav";
import { useStorageLocationDialogs } from "@/features/storage/api/use-storage-location-dialogs";
import { useStorageReviewStart } from "@/features/storage/api/use-storage-review-start";
import { StorageLocationDialogs } from "@/features/storage/components/storage-location-dialogs";
import { LibraryViewTabs } from "@/features/library/components/library-view-tabs";
import { Callout } from "@/components/callout";
import { EmptyState } from "@/components/empty-state";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { HotkeyHint } from "@/components/hotkey-hint";
import { ListSkeleton } from "@/components/list-skeleton";
import { SkeletonStatus } from "@/components/skeleton-status";
import { TableSkeleton } from "@/components/table-skeleton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useStorageLocationSelection } from "@/features/storage/api/use-storage-location-selection";
import { StorageLocationSelectionBar } from "@/features/storage/components/storage-location-selection-bar";
import { AddCardDialog } from "@/features/cards/components/add-card-dialog";
import { QuickAddDialog } from "@/features/cards/components/quick-add-dialog";
import { useCollections } from "@/features/collections/api/use-collections";
import { useStorageAccess } from "@/features/storage/api/use-storage-access";
import {
  storageLocationPageQueryOptions,
  storageLocationQueryOptions,
  fetchStorageLocationUnreviewedCardPage,
  storageLocationUnreviewedCardsQueryOptions,
} from "@/features/storage/api/storage-locations";
import { ReviewGrid } from "@/features/cards/components/review-grid";
import { ReviewQueueList } from "@/features/cards/components/review-queue-panel";
import { useStorageReviewQueue } from "@/features/storage/api/use-storage-review-queue";
import { CARD_REVIEW_GRID_PARAM_VALUE } from "@/lib/constants/cards";
import { useOrg } from "@/features/companies/api/use-organization";
import { useServerPagedList } from "@/hooks/use-server-paged-list";
import { useQuery } from "@tanstack/react-query";
import { useStorageLocations } from "@/features/storage/api/use-storage-locations";
import { useStorageLocationCardQuery } from "@/features/storage/api/use-storage-location-card-query";
import { StorageCardDetail } from "@/features/storage/components/storage-card-detail";
import { StorageExportMenu } from "@/features/storage/components/storage-export-menu";
import { ShareLinkTriggerButton } from "@/components/share-link-trigger-button";
import { ShareStorageLinkDialog } from "@/features/storage/components/share-storage-link-dialog";
import { StorageLocationContent } from "@/features/storage/components/storage-location-content";
import { StorageLocationList } from "@/features/storage/components/storage-location-list";
import { StorageSearchResults } from "@/features/storage/components/storage-search-results";
import { StorageUpgradeNote } from "@/features/storage/components/storage-upgrade-note";
import { MobileStorage } from "@/features/storage/components/mobile-storage";
import { useStorageLabelOrgSwitch } from "@/features/storage-labels/api/use-storage-label-org-switch";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { usePriceSource } from "@/hooks/use-price-source";
import {
  STORAGE_CARD_SEARCH_PARAM,
  STORAGE_LOCATION_SEARCH_PARAM,
  LEGACY_STORAGE_PICKS_VIEW,
  LEGACY_STORAGE_VIEW_PARAM,
  STORAGE_PICK_LIST_PATH,
  STORAGE_REVIEW_SEARCH_PARAM,
  STORAGE_PANEL_PADDING_TOP,
  STORAGE_TOOLBAR_TOP_CSS_VARIABLE,
  storageLabelsPath,
} from "@/lib/constants/storage";
import { writeStorageSelectionSearchParams } from "@/features/storage/lib/storage-search-params";
import {
  STORAGE_CARDS_SKELETON_COLUMNS,
  STORAGE_CARDS_SKELETON_ROWS,
} from "@/lib/constants/skeletons";
import type { StorageSelectionSearchParams } from "@/lib/interfaces/storage";
import { useElementHeight } from "@/hooks/use-element-height";
import { ORDER_PARAM, picksPath } from "@/lib/constants/business";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import {
  IconBox,
  IconEdit,
  IconListCheck,
  IconListSearch,
  IconBolt,
  IconPlus,
  IconStack2,
  IconPrinter,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { storageLocationFillText } from "@/features/storage/lib/storage-location-fill";

function DesktopStoragePage() {
  const { t } = useTranslation("storage");
  const { t: tCommon } = useTranslation("common");
  const { isMutating, create, update, createSeries, remove } = useStorageLocations({
    withList: false,
  });
  const { activeOrg } = useOrg();
  const { format } = usePriceSource();
  const { isLocked } = useStorageAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const dialogs = useStorageLocationDialogs();
  const {
    setCreateOpen,
    setRenameOpen,
    setDeleteOpen,
    setShareOpen,
    setMenuLocation,
    openLocationAction,
  } = dialogs;
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const { collections } = useCollections();
  const [searchQuery, setSearchQuery] = useState("");
  const [locationHeaderElement, setLocationHeaderElement] =
    useState<HTMLDivElement | null>(null);
  const locationHeaderHeight = useElementHeight(locationHeaderElement);
  const debouncedQuery = useDebouncedValue(
    searchQuery.trim(),
    SEARCH_DEBOUNCE_MS,
  );
  const isSearching = searchQuery.trim().length > 0;

  const selectedParam = searchParams.get(STORAGE_LOCATION_SEARCH_PARAM);
  const {
    items: locations,
    pagination,
    isLoading,
    isError,
    refetch,
  } = useServerPagedList(
    (request) => storageLocationPageQueryOptions(activeOrg?.id, request),
    selectedParam,
  );
  const hasLocations = pagination.total > 0;
  const locationSelection = useStorageLocationSelection(locations);
  const showsLoadError = isError && !hasLocations;
  const selectedGuid = selectedParam ?? locations[0]?.guid;
  const { data: selectedLocation } = useQuery(
    storageLocationQueryOptions(selectedGuid),
  );
  const selected =
    locations.find((l) => l.guid === selectedGuid) ??
    (selectedLocation?.guid === selectedGuid ? selectedLocation : undefined);
  const cardQuery = useStorageLocationCardQuery(selected?.guid);
  const openScanId = searchParams.get(STORAGE_CARD_SEARCH_PARAM);
  const reviewParam = searchParams.get(STORAGE_REVIEW_SEARCH_PARAM);
  const isReviewing = reviewParam === "1";
  const isCardOpen = !!selected && !isSearching && !!openScanId;
  const isGridReviewing =
    !!selected &&
    !isSearching &&
    !openScanId &&
    reviewParam === CARD_REVIEW_GRID_PARAM_VALUE;
  const isOneByOneReviewing = isCardOpen && isReviewing;
  const reviewQueue = useStorageReviewQueue(
    selected?.guid,
    isOneByOneReviewing,
  );
  const reviewGridPage = useQuery(
    storageLocationUnreviewedCardsQueryOptions(selected?.guid, isGridReviewing),
  );
  const selectedLocationGuid = selected?.guid;
  const loadStorageReviewCardPage = selectedLocationGuid
    ? (page: number) =>
        fetchStorageLocationUnreviewedCardPage(selectedLocationGuid, page)
    : undefined;

  const shownLocationGuid = selectedGuid;
  const showSelection = useCallback(
    (
      selection: Omit<StorageSelectionSearchParams, "shownLocationGuid">,
    ) =>
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          writeStorageSelectionSearchParams(next, {
            ...selection,
            shownLocationGuid,
          });
          return next;
        },
        { replace: true },
      ),
    [shownLocationGuid, setSearchParams],
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
    if (shownLocationGuid) select(shownLocationGuid);
  }, [shownLocationGuid, select]);

  const { setReviewLayout, openReviewGrid, startReview } =
    useStorageReviewStart(selected, openCard);

  const canStartReview =
    !isLocked &&
    !!selected &&
    !isSearching &&
    !isCardOpen &&
    !isGridReviewing &&
    selected.cardCount > 0;

  const canQuickAdd = !!selected && !isLocked && collections.length > 0;

  useHotkeys({
    reviewStart: canStartReview ? () => void startReview() : undefined,
    quickAddCards: canQuickAdd ? () => setQuickAddOpen(true) : undefined,
  });

  const openLocation = (guid: string) => {
    setSearchQuery("");
    select(guid);
  };

  const openStoredCard = (guid: string, scanId: string) => {
    setSearchQuery("");
    openCard(guid, scanId, false);
  };

  const showsLocationHeading =
    !!selected &&
    !isSearching &&
    !(isCardOpen && openScanId) &&
    !isGridReviewing;

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      {!showsLocationHeading && (
        <h1 className="sr-only">{tCommon("nav.library")}</h1>
      )}
      <div className="shrink-0 border-b px-3 pt-1">
        <LibraryViewTabs value="storage" />
      </div>
      <div className="grid flex-1 min-h-0 grid-cols-12 overflow-hidden">
        {isOneByOneReviewing && selected ? (
          <section className="col-span-4 flex h-full flex-col overflow-hidden border-r lg:col-span-3">
            <ReviewQueueList
              cards={reviewQueue.cards}
              totalCards={reviewQueue.totalCards}
              isPending={reviewQueue.isPending}
              isError={reviewQueue.isError}
              onRetry={reviewQueue.retry}
              currentScanId={openScanId}
              reviewedScanIds={reviewQueue.reviewedScanIds}
              removedScanIds={reviewQueue.removedScanIds}
              onOpen={(scanId) => openCard(selected.guid, scanId, true)}
              onExit={closeCard}
            />
          </section>
        ) : (
          <section className="col-span-4 flex h-full flex-col gap-2 overflow-hidden border-r bg-sidebar/70 p-2 lg:col-span-3">
            {!isLoading && hasLocations ? (
              <div className="flex items-center gap-1.5">
                <Input
                  type="search"
                  placeholder={t("search.placeholder")}
                  aria-label={t("search.placeholder")}
                  data-hotkey-search
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="min-w-0 flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t("pickList.open")}
                  title={t("pickList.open")}
                  nativeButton={false}
                  render={<Link to={STORAGE_PICK_LIST_PATH} />}
                >
                  <IconListSearch />
                </Button>
                {!isLocked && (
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={t("labels.printLabels")}
                    title={t("labels.printLabels")}
                    nativeButton={false}
                    render={<Link to={storageLabelsPath()} />}
                  >
                    <IconPrinter />
                  </Button>
                )}
                {!isLocked && (
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={t("series.open")}
                    title={t("series.open")}
                    onClick={() => dialogs.setSeriesOpen(true)}
                    disabled={isMutating}
                  >
                    <IconStack2 />
                  </Button>
                )}
                {!isLocked && (
                  <Button
                    size="icon"
                    aria-label={t("page.newLocation")}
                    title={t("page.newLocation")}
                    onClick={() => setCreateOpen(true)}
                    disabled={isMutating}
                  >
                    <IconPlus />
                  </Button>
                )}
              </div>
            ) : (
              !isLoading &&
              !isLocked && (
                <Button
                  className="w-full"
                  onClick={() => setCreateOpen(true)}
                  disabled={isMutating}
                >
                  <IconPlus />
                  {t("page.newLocation")}
                </Button>
              )
            )}
            {!isLoading && hasLocations && !isLocked && (
              <label className="flex items-center gap-1.5 px-1.5 text-xs text-foreground/70">
                <Checkbox
                  checked={locationSelection.allVisibleChecked}
                  onCheckedChange={locationSelection.toggleAllVisible}
                />
                {t("bulk.selectAllOnPage")}
              </label>
            )}
            <StorageLocationList
              locations={locations}
              pagination={pagination}
              selectedGuid={isSearching ? undefined : selected?.guid}
              isLoading={isLoading}
              onSelect={openLocation}
              checkedGuids={isLocked ? undefined : locationSelection.checkedGuids}
              onToggleChecked={isLocked ? undefined : locationSelection.toggle}
              actions={
                isLocked
                  ? undefined
                  : {
                      disabled: isMutating,
                      onShare: (location) => openLocationAction(location, setShareOpen),
                      onRename: (location) => openLocationAction(location, setRenameOpen),
                      onDelete: (location) => openLocationAction(location, setDeleteOpen),
                    }
              }
            />
          </section>
        )}

        {isCardOpen && selected && openScanId ? (
          <section className="col-span-8 flex min-h-0 flex-col overflow-hidden lg:col-span-9">
            <StorageCardDetail
              location={selected}
              cardsQuery={cardQuery.cardsQuery}
              scanId={openScanId}
              reviewMode={isReviewing}
              onNavigate={(scanId) => openCard(selected.guid, scanId)}
              onShowReviewGrid={openReviewGrid}
              onClose={closeCard}
              onReviewed={reviewQueue.markReviewed}
              onRemoved={reviewQueue.markRemoved}
            />
          </section>
        ) : isGridReviewing && selected ? (
          <section className="col-span-8 flex min-h-0 flex-col overflow-y-auto lg:col-span-9">
            <ReviewGrid
              cards={reviewGridPage.data?.cards ?? []}
              total={reviewGridPage.data?.total ?? 0}
              loadReviewCardPage={loadStorageReviewCardPage}
              isLoading={reviewGridPage.isPending}
              isError={reviewGridPage.isError}
              onRetry={() => void reviewGridPage.refetch()}
              onOpenOneByOne={(card) => {
                setReviewLayout("single");
                openCard(selected.guid, card.scanId, true);
              }}
              onClose={closeCard}
            />
          </section>
        ) : (
          <section
            className="col-span-8 flex max-h-full flex-col gap-4 overflow-y-auto p-4 md:gap-2 md:px-3 md:py-2 lg:col-span-9"
            style={
              {
                [STORAGE_TOOLBAR_TOP_CSS_VARIABLE]: `calc(${locationHeaderHeight}px - ${STORAGE_PANEL_PADDING_TOP})`,
              } as CSSProperties
            }
          >
            {selected && !isSearching && (
              <div
                ref={setLocationHeaderElement}
                className="sticky -top-4 z-50 -mx-4 -mt-4 flex items-center gap-1.5 border-b bg-background/80 p-2 pl-4 backdrop-blur-2xl md:-top-2 md:-mx-3 md:-mt-2 md:pl-3">
                <div className="mr-auto min-w-0">
                  <h1 className={cn(PAGE_TITLE_CLASS, "truncate")}>
                    {selected.name}
                  </h1>
                  <p className="text-xs tabular-nums text-foreground/70">
                    {[
                      t("page.summary", {
                        count: selected.cardCount,
                        value: format(selected.totalValue),
                      }),
                      storageLocationFillText(selected, t),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {!isLocked && (
                  <Button
                    variant="outline"
                    disabled={collections.length === 0}
                    onClick={() => setAddCardOpen(true)}
                  >
                    <IconPlus />
                    {t("page.addCard")}
                  </Button>
                )}
                {canQuickAdd && (
                  <Button
                    variant="outline"
                    onClick={() => setQuickAddOpen(true)}
                  >
                    <IconBolt />
                    {t("page.quickAdd")}
                  </Button>
                )}
                {selected.cardCount > 0 && (
                  <>
                    {!isLocked && (
                      <Button
                        variant="outline"
                        title={t("review.startTitle")}
                        onClick={() => void startReview()}
                      >
                        <IconListCheck />
                        {t("review.start")}
                        <HotkeyHint id="reviewStart" />
                      </Button>
                    )}
                    <StorageExportMenu location={selected} />
                  </>
                )}
                {!isLocked && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={t("labels.printLabel")}
                      title={t("labels.printLabel")}
                      nativeButton={false}
                      render={<Link to={storageLabelsPath([selected.guid])} />}
                    >
                      <IconPrinter />
                    </Button>
                    <ShareStorageLinkDialog
                      locationGuid={selected.guid}
                      renderTrigger={(activeLinkCount) => (
                        <ShareLinkTriggerButton
                          variant="outline"
                          size="icon"
                          label={t("shareLink.trigger")}
                          activeLinkCount={activeLinkCount}
                          showsTitle
                        />
                      )}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={t("page.rename")}
                      title={t("page.rename")}
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
                      title={t("page.delete")}
                      disabled={isMutating}
                      onClick={() => {
                        setMenuLocation(null);
                        setDeleteOpen(true);
                      }}
                    >
                      <IconTrash />
                    </Button>
                  </>
                )}
              </div>
            )}

            {isLocked && (
              <Callout variant="info" className="shrink-0">
                {t(
                  hasLocations
                    ? "upgrade.lockedWithLocations"
                    : "upgrade.locked",
                )}{" "}
                <StorageUpgradeNote />
              </Callout>
            )}

            {isLoading ? (
              <SkeletonStatus className="flex flex-col gap-4 md:gap-2">
                <div className="-mx-4 -mt-4 flex items-center gap-1.5 border-b p-2 pl-4 md:-mx-3 md:-mt-2 md:pl-3">
                  <div className="mr-auto flex min-w-0 flex-col">
                    <div className="flex h-7 items-center">
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <div className="flex h-4 items-center">
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-24 shrink-0 rounded-lg md:h-7" />
                  <Skeleton className="h-10 w-24 shrink-0 rounded-lg md:h-7" />
                  <Skeleton className="size-10 shrink-0 rounded-lg md:size-7" />
                  <Skeleton className="size-10 shrink-0 rounded-lg md:size-7" />
                </div>
                <div className="flex h-11 items-center gap-4 border-b md:h-7">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <TableSkeleton columns={STORAGE_CARDS_SKELETON_COLUMNS} rows={STORAGE_CARDS_SKELETON_ROWS} />
              </SkeletonStatus>
            ) : showsLoadError ? (
              <LoadErrorCallout
                message={t("page.loadFailed")}
                onRetry={refetch}
              />
            ) : !hasLocations ? (
              <EmptyState
                icon={IconBox}
                title={t("page.emptyTitle")}
                description={t("page.emptyDescription")}
              />
            ) : isSearching ? (
              debouncedQuery ? (
                <StorageSearchResults
                  query={debouncedQuery}
                  onOpenLocation={openLocation}
                  onOpenCard={(entry) =>
                    openStoredCard(entry.locationGuid, entry.scanId)
                  }
                />
              ) : (
                <SkeletonStatus className="flex flex-col gap-3">
                  <Skeleton className="h-3 w-24" />
                  <TableSkeleton columns={STORAGE_CARDS_SKELETON_COLUMNS} rows={STORAGE_CARDS_SKELETON_ROWS} />
                </SkeletonStatus>
              )
            ) : (
              selected && (
                <StorageLocationContent
                  location={selected}
                  cardQuery={cardQuery}
                  onOpenCard={(entry) =>
                    openStoredCard(entry.locationGuid, entry.scanId)
                  }
                />
              )
            )}
          </section>
        )}
      </div>

      {selected && (
        <AddCardDialog
          open={addCardOpen}
          onOpenChange={setAddCardOpen}
          locationGuid={selected.guid}
        />
      )}
      {selected && (
        <QuickAddDialog
          open={quickAddOpen}
          onOpenChange={setQuickAddOpen}
          locationGuid={selected.guid}
        />
      )}
      <StorageLocationDialogs
        dialogs={dialogs}
        selected={selected}
        create={create}
        update={update}
        createSeries={createSeries}
        remove={remove}
        onCreated={select}
        onSelectedDeleted={() => select(null)}
      />
      {!isLocked && (
        <StorageLocationSelectionBar
          selection={locationSelection}
          showsPrintLabels
        />
      )}
    </div>
  );
}

export default function StoragePage() {
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const isSwitchingToLabelOrg = useStorageLabelOrgSwitch();
  if (
    searchParams.get(LEGACY_STORAGE_VIEW_PARAM) === LEGACY_STORAGE_PICKS_VIEW
  ) {
    return <Navigate to={picksPath(searchParams.get(ORDER_PARAM))} replace />;
  }
  if (isSwitchingToLabelOrg) return <ListSkeleton />;
  if (isMobile) return <MobileStorage />;
  return <DesktopStoragePage />;
}
