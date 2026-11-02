import { Callout } from "@/components/callout";
import { DeleteDialog } from "@/components/delete-dialog";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { MobileListRow } from "@/components/mobile-list-row";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { MobileSearchInput } from "@/components/mobile-search-input";
import { Button } from "@/components/ui/button";
import { DrawerTitle } from "@/components/ui/drawer";
import {
  fetchNextUnreviewedStorageCard,
  storageLocationUnreviewedCardsQueryOptions,
} from "@/features/storage/api/storage-locations";
import { useReviewLayout } from "@/features/cards/api/use-card-view-preferences";
import { MobileCardDrawer } from "@/features/cards/components/mobile-card-drawer";
import { ReviewGrid } from "@/features/cards/components/review-grid";
import { CARD_REVIEW_GRID_PARAM_VALUE } from "@/lib/constants/cards";
import { useQuery } from "@tanstack/react-query";
import { useStorageAccess } from "@/features/storage/api/use-storage-access";
import { useStorageLocations } from "@/features/storage/api/use-storage-locations";
import { StorageCardDetail } from "@/features/storage/components/storage-card-detail";
import { StorageExportMenu } from "@/features/storage/components/storage-export-menu";
import { StorageLocationCards } from "@/features/storage/components/storage-location-cards";
import { StorageLocationNameDialog } from "@/features/storage/components/storage-location-name-dialog";
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
  STORAGE_REVIEW_SEARCH_PARAM,
} from "@/lib/constants/storage";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  IconBox,
  IconEdit,
  IconListCheck,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

export function MobileStorage() {
  const { t } = useTranslation("storage");
  const { t: tCards } = useTranslation("cards");
  const { locations, isLoading, isMutating, create, rename, remove } =
    useStorageLocations();
  const { format } = usePriceSource();
  const { isLocked } = useStorageAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(
    searchQuery.trim(),
    SEARCH_DEBOUNCE_MS,
  );
  const isSearching = searchQuery.trim().length > 0;

  const selectedGuid = searchParams.get(STORAGE_LOCATION_SEARCH_PARAM);
  const selected = locations.find((l) => l.guid === selectedGuid);
  const openScanId = searchParams.get(STORAGE_CARD_SEARCH_PARAM);
  const [shownScanId, setShownScanId] = useState(openScanId);
  if (openScanId && openScanId !== shownScanId) setShownScanId(openScanId);
  const reviewParam = searchParams.get(STORAGE_REVIEW_SEARCH_PARAM);
  const isReviewing = reviewParam === "1";
  const isGridReviewing =
    !!selected && !openScanId && reviewParam === CARD_REVIEW_GRID_PARAM_VALUE;
  const [reviewLayout, setReviewLayout] = useReviewLayout();
  const reviewGridPage = useQuery(
    storageLocationUnreviewedCardsQueryOptions(selected?.guid, isGridReviewing),
  );

  const select = useCallback(
    (guid: string | null) =>
      setSearchParams(guid ? { [STORAGE_LOCATION_SEARCH_PARAM]: guid } : {}, {
        replace: true,
      }),
    [setSearchParams],
  );

  const openCard = (guid: string, scanId: string, review = isReviewing) =>
    setSearchParams(
      {
        [STORAGE_LOCATION_SEARCH_PARAM]: guid,
        [STORAGE_CARD_SEARCH_PARAM]: scanId,
        ...(review ? { [STORAGE_REVIEW_SEARCH_PARAM]: "1" } : {}),
      },
      { replace: true },
    );

  const closeCard = useCallback(() => {
    if (selected) select(selected.guid);
  }, [selected, select]);

  const openReviewGrid = () => {
    if (!selected) return;
    setReviewLayout("grid");
    setSearchParams(
      {
        [STORAGE_LOCATION_SEARCH_PARAM]: selected.guid,
        [STORAGE_REVIEW_SEARCH_PARAM]: CARD_REVIEW_GRID_PARAM_VALUE,
      },
      { replace: true },
    );
  };

  const startReview = async () => {
    if (!selected) return;
    if (reviewLayout === "grid") {
      openReviewGrid();
      return;
    }
    const first = await fetchNextUnreviewedStorageCard(selected.guid).catch(
      () => null,
    );
    if (first) openCard(selected.guid, first, true);
    else toast.info(t("review.nothingLeft"));
  };

  const dialogs = (
    <>
      <StorageLocationNameDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t("page.newLocation")}
        submitLabel={t("nameDialog.create")}
        onSubmit={async (name) => {
          const guid = await create(name);
          return !!guid;
        }}
      />
      <StorageLocationNameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        initialName={selected?.name}
        title={t("page.rename")}
        submitLabel={t("nameDialog.save")}
        onSubmit={(name) =>
          selected ? rename(selected.guid, name) : Promise.resolve(false)
        }
      />
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("page.deleteTitle", { name: selected?.name ?? "" })}
        description={t("page.deleteDescription")}
        confirm={{ type: "name", name: selected?.name ?? "" }}
        onConfirm={async () => {
          setDeleteOpen(false);
          if (selected && (await remove(selected.guid))) select(null);
        }}
      />
    </>
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
            value: format(selected.totalValue),
          })}
          onBack={() => select(null)}
          actions={
            !isLocked && (
              <>
                <Button
                  variant="ghost"
                  className={MOBILE_CIRCLE_BUTTON_CLASS}
                  aria-label={t("page.rename")}
                  disabled={isMutating}
                  onClick={() => setRenameOpen(true)}
                >
                  <IconEdit />
                </Button>
                <Button
                  variant="ghost"
                  className={cn(MOBILE_CIRCLE_BUTTON_CLASS, "text-destructive")}
                  aria-label={t("page.delete")}
                  disabled={isMutating}
                  onClick={() => setDeleteOpen(true)}
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
            <StorageLocationCards
              location={selected}
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
        title={t("page.title")}
        actions={
          !isLocked && (
            <Button
              className={MOBILE_PRIMARY_CIRCLE_BUTTON_CLASS}
              aria-label={t("page.newLocation")}
              disabled={isMutating}
              onClick={() => setCreateOpen(true)}
            >
              <IconPlus />
            </Button>
          )
        }
      >
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
                <MobileListRow
                  key={location.guid}
                  icon={<IconBox />}
                  label={location.name}
                  description={t("page.summary", {
                    count: location.cardCount,
                    value: format(location.totalValue),
                  })}
                  onClick={() => select(location.guid)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {dialogs}
    </div>
  );
}
