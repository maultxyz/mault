import { EmptyState } from "@/components/empty-state";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { Button } from "@/components/ui/button";
import { DrawerTitle } from "@/components/ui/drawer";
import { MobileCardDrawer } from "@/features/cards/components/mobile-card-drawer";
import {
  intakeLotQueryOptions,
  intakeLotsQueryOptions,
  intakeUnreviewedCardsQueryOptions,
} from "@/features/business/api/business";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { BusinessUpgradeCallout } from "@/features/business/components/business-upgrade-callout";
import { IntakeCardDetail } from "@/features/business/components/intake-card-detail";
import { IntakeLotDetail } from "@/features/business/components/intake-lot-detail";
import { IntakeLotDialog } from "@/features/business/components/intake-lot-dialog";
import { IntakeLotList } from "@/features/business/components/intake-lot-list";
import { BusinessViewSwitch } from "@/features/business/components/business-view-switch";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useServerPagedList } from "@/hooks/use-server-paged-list";
import { MOBILE_NAV_SCROLL_PADDING_CLASS } from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import {
  BUSINESS_INTAKE_VIEW,
  INTAKE_CARD_PARAM,
  INTAKE_LOT_PARAM,
  INTAKE_REVIEW_PARAM,
} from "@/lib/constants/business";
import { useReviewLayout } from "@/features/cards/api/use-card-view-preferences";
import { ReviewGrid } from "@/features/cards/components/review-grid";
import { CARD_REVIEW_GRID_PARAM_VALUE } from "@/lib/constants/cards";
import { IconCash, IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

export default function IntakePage() {
  const { t } = useTranslation("business");
  const { t: tCommon } = useTranslation("common");
  const { t: tCards } = useTranslation("cards");
  const isMobile = useIsMobile();
  const { orgId, access } = useBusinessAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedParam = searchParams.get(INTAKE_LOT_PARAM);
  const {
    items: lots,
    pagination,
    isLoading,
  } = useServerPagedList(
    (request) => intakeLotsQueryOptions(orgId, request),
    selectedParam,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const selectedGuid = isMobile
    ? (selectedParam ?? undefined)
    : (selectedParam ?? lots[0]?.guid);
  const openScanId = searchParams.get(INTAKE_CARD_PARAM);
  const [shownScanId, setShownScanId] = useState(openScanId);
  if (openScanId && openScanId !== shownScanId) setShownScanId(openScanId);
  const reviewParam = searchParams.get(INTAKE_REVIEW_PARAM);
  const isReviewing = reviewParam === "1";
  const isGridReviewing =
    !!selectedGuid &&
    !openScanId &&
    reviewParam === CARD_REVIEW_GRID_PARAM_VALUE;
  const [, setReviewLayout] = useReviewLayout();
  const { data: selectedLot } = useQuery(intakeLotQueryOptions(selectedGuid));
  const reviewGridPage = useQuery(
    intakeUnreviewedCardsQueryOptions(selectedGuid, isGridReviewing),
  );

  const select = (guid: string | null) =>
    setSearchParams(guid ? { [INTAKE_LOT_PARAM]: guid } : {}, {
      replace: true,
    });

  const openCard = (scanId: string, review = isReviewing) => {
    if (!selectedGuid) return;
    setSearchParams(
      {
        [INTAKE_LOT_PARAM]: selectedGuid,
        [INTAKE_CARD_PARAM]: scanId,
        ...(review ? { [INTAKE_REVIEW_PARAM]: "1" } : {}),
      },
      { replace: true },
    );
  };

  const openReviewGrid = () => {
    if (!selectedGuid) return;
    setReviewLayout("grid");
    setSearchParams(
      {
        [INTAKE_LOT_PARAM]: selectedGuid,
        [INTAKE_REVIEW_PARAM]: CARD_REVIEW_GRID_PARAM_VALUE,
      },
      { replace: true },
    );
  };

  const closeCard = useCallback(() => {
    setSearchParams(selectedGuid ? { [INTAKE_LOT_PARAM]: selectedGuid } : {}, {
      replace: true,
    });
  }, [selectedGuid, setSearchParams]);

  const createDialog = (
    <IntakeLotDialog
      open={createOpen}
      onOpenChange={setCreateOpen}
      onCreated={(guid) => select(guid)}
    />
  );

  if (isMobile) {
    if (isGridReviewing) {
      return (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <ReviewGrid
            cards={reviewGridPage.data?.cards ?? []}
            total={reviewGridPage.data?.total ?? 0}
            isLoading={reviewGridPage.isPending}
            isError={reviewGridPage.isError}
            onOpenOneByOne={(card) => {
              setReviewLayout("single");
              openCard(card.scanId, true);
            }}
            onClose={closeCard}
          />
        </div>
      );
    }
    if (selectedGuid) {
      return (
        <div className="relative flex min-h-0 flex-1 flex-col">
          <MobilePageHeader
            title={t("views.intake")}
            onBack={() => select(null)}
          />
          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto p-4",
              MOBILE_NAV_SCROLL_PADDING_CLASS,
            )}
          >
            <div className="flex flex-col gap-4">
              {access?.isLocked && <BusinessUpgradeCallout />}
              <IntakeLotDetail
                key={selectedGuid}
                guid={selectedGuid}
                onDeleted={() => select(null)}
                onOpenCard={openCard}
                onOpenReviewGrid={openReviewGrid}
              />
            </div>
          </div>
          <MobileCardDrawer open={!!openScanId} onClose={closeCard}>
            <DrawerTitle className="sr-only">
              {tCards("cardDetailPanel.cardDetailsFallback")}
            </DrawerTitle>
            {shownScanId && selectedLot && (
              <div data-vaul-no-drag className="flex min-h-0 flex-1 flex-col">
                <IntakeCardDetail
                  key={shownScanId}
                  lot={selectedLot}
                  scanId={shownScanId}
                  reviewMode={isReviewing}
                  onNavigate={(scanId) => openCard(scanId)}
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
      <div className="relative flex min-h-0 flex-1 flex-col">
        <MobilePageHeader
          title={tCommon("nav.intake")}
          actions={
            <Button
              variant="outline"
              size="icon"
              aria-label={t("intake.new")}
              disabled={access?.isLocked}
              onClick={() => setCreateOpen(true)}
            >
              <IconPlus />
            </Button>
          }
        />
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            MOBILE_NAV_SCROLL_PADDING_CLASS,
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
            <BusinessViewSwitch value={BUSINESS_INTAKE_VIEW} />
            {access?.isLocked && <BusinessUpgradeCallout />}
            <IntakeLotList
              lots={lots}
              pagination={pagination}
              selectedGuid={selectedGuid}
              isLoading={isLoading}
              onSelect={select}
            />
          </div>
        </div>
        {createDialog}
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      <div className="grid flex-1 min-h-0 grid-cols-12 overflow-hidden">
        <section className="col-span-4 flex h-full flex-col gap-2 overflow-hidden border-r bg-sidebar/70 p-2 lg:col-span-3">
          <BusinessViewSwitch value={BUSINESS_INTAKE_VIEW} />
          <Button
            variant="outline"
            className="w-full"
            disabled={access?.isLocked}
            onClick={() => setCreateOpen(true)}
          >
            <IconPlus />
            {t("intake.new")}
          </Button>
          <IntakeLotList
            lots={lots}
            pagination={pagination}
            selectedGuid={selectedGuid}
            isLoading={isLoading}
            onSelect={select}
          />
        </section>
        {selectedGuid && openScanId && selectedLot ? (
          <section className="col-span-8 flex min-h-0 flex-col overflow-hidden lg:col-span-9">
            <IntakeCardDetail
              lot={selectedLot}
              scanId={openScanId}
              reviewMode={isReviewing}
              onNavigate={(scanId) => openCard(scanId)}
              onShowReviewGrid={openReviewGrid}
              onClose={closeCard}
            />
          </section>
        ) : isGridReviewing ? (
          <section className="col-span-8 flex min-h-0 flex-col overflow-y-auto lg:col-span-9">
            <ReviewGrid
              cards={reviewGridPage.data?.cards ?? []}
              total={reviewGridPage.data?.total ?? 0}
              isLoading={reviewGridPage.isPending}
              isError={reviewGridPage.isError}
              onOpenOneByOne={(card) => {
                setReviewLayout("single");
                openCard(card.scanId, true);
              }}
              onClose={closeCard}
            />
          </section>
        ) : (
          <section className="col-span-8 flex max-h-full flex-col gap-4 overflow-y-auto p-4 lg:col-span-9">
            {access?.isLocked && <BusinessUpgradeCallout />}
            {selectedGuid ? (
              <IntakeLotDetail
                key={selectedGuid}
                guid={selectedGuid}
                onDeleted={() => select(null)}
                onOpenCard={openCard}
                onOpenReviewGrid={openReviewGrid}
              />
            ) : (
              !isLoading && (
                <EmptyState
                  icon={IconCash}
                  title={t("intake.pickTitle")}
                  description={t("intake.pickDescription")}
                />
              )
            )}
          </section>
        )}
      </div>
      {createDialog}
    </div>
  );
}
