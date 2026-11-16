import type { StorageLocationCardContext } from "@magic-vault/shared";
import { CardDetailScopeContext } from "@/features/cards/api/use-card-detail-scope";
import { CardDetailPanelSkeleton } from "@/features/cards/components/card-detail-panel-skeleton";
import { CardDetailPanel } from "@/features/cards/components/card-detail-panel";
import { useCardContextNavigation } from "@/features/cards/api/use-card-context-navigation";
import { useCollections } from "@/features/collections/api/use-collections";
import {
  storageLocationCardContextQueryOptions,
  storageLocationKeys,
} from "@/features/storage/api/storage-locations";
import {
  useMoveCardsToLocation,
  useRemoveCardFromLocation,
  useStoredCardActions,
} from "@/features/storage/api/use-storage-locations";
import { MoveToLocationDialog } from "@/features/storage/components/move-to-location-dialog";
import { RemoveFromLocationDialog } from "@/features/storage/components/remove-from-location-dialog";
import { useStorageAccess } from "@/features/storage/api/use-storage-access";
import { ALL_CARDS_QUERY } from "@/lib/constants/card-filters";
import type { StorageCardDetailProps } from "@/lib/interfaces/storage";
import { toast } from "@/lib/toast";
import { IconBoxOff, IconTransfer } from "@tabler/icons-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export function StorageCardDetail({
  location,
  cardsQuery,
  scanId,
  reviewMode,
  onNavigate,
  onShowReviewGrid,
  onClose,
  onReviewed,
  onRemoved,
}: StorageCardDetailProps) {
  const { t } = useTranslation("cards");
  const { t: tStorage } = useTranslation("storage");
  const { removeCard, isRemoving } = useRemoveCardFromLocation();
  const { isLocked: storageLocked } = useStorageAccess();
  const { moveCards, isMoving } = useMoveCardsToLocation();
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const { collections } = useCollections();
  const navigationQuery = reviewMode ? ALL_CARDS_QUERY : cardsQuery;
  const contextQueryOptionsFor = useCallback(
    (contextScanId: string) =>
      storageLocationCardContextQueryOptions(
        location.guid,
        contextScanId,
        reviewMode,
        navigationQuery,
      ),
    [location.guid, reviewMode, navigationQuery],
  );
  const {
    context,
    stored,
    scanned,
    total,
    prevScanId,
    nextScanId,
    reviewSession,
  } = useCardContextNavigation<
    StorageLocationCardContext,
    ReturnType<typeof storageLocationKeys.cardContext>
  >(
    contextQueryOptionsFor,
    scanId,
    reviewMode,
    onClose,
  );
  const entry = useMemo(
    () =>
      stored
        ? {
            ...stored,
            locationGuid: location.guid,
            locationName: location.name,
          }
        : null,
    [stored, location.guid, location.name],
  );
  const actions = useStoredCardActions(entry);
  const collection =
    collections.find((c) => c.guid === stored?.collectionGuid) ?? null;

  if (!context || !stored || !scanned) return <CardDetailPanelSkeleton />;

  const leaveCard = () => {
    if (reviewMode) {
      reviewSession.forget(scanId);
      onRemoved?.(scanId);
    }
    if (nextScanId) onNavigate(nextScanId);
    else onClose();
  };

  const removeFromLocation = (alsoRemoveFromCollection: boolean) => {
    setConfirmRemoveOpen(false);
    void removeCard({
      locationGuid: location.guid,
      scanId,
      collectionGuid: stored.collectionGuid,
      alsoRemoveFromCollection,
    });
    leaveCard();
  };

  const moveToLocation = async (locationGuid: string) => {
    const moved = await moveCards({
      guid: locationGuid,
      scanIds: [scanId],
      collectionGuid: stored.collectionGuid,
    });
    if (moved) leaveCard();
    return moved;
  };

  return (
    <CardDetailScopeContext value={{ collection, actions }}>
      <CardDetailPanel
        scanId={scanId}
        currentCard={stored.card}
        alternativeMatches={scanned.alternativeMatches}
        lowConfidenceMatch={stored.lowConfidenceMatch}
        wasCorrected={stored.corrected}
        isReviewed={stored.reviewed}
        isDownloaded={scanned.isDownloaded}
        isFoil={stored.isFoil}
        foilType={stored.foilType ?? undefined}
        stamp={stored.stamp ?? undefined}
        condition={stored.condition}
        language={stored.language ?? undefined}
        binNumber={scanned.binNumber}
        onClose={onClose}
        onPrev={() => prevScanId && onNavigate(prevScanId)}
        onNext={() => nextScanId && onNavigate(nextScanId)}
        hasPrev={!!prevScanId}
        hasNext={!!nextScanId}
        currentIndex={context.index}
        total={total}
        reviewMode={reviewMode}
        onReviewed={onReviewed}
        onShowReviewGrid={onShowReviewGrid}
        onReviewComplete={() => {
          toast.success(t("review.complete", { count: total }));
          onClose();
        }}
        onRemoveShortcut={
          storageLocked ? undefined : () => setConfirmRemoveOpen(true)
        }
        extraActions={
          storageLocked
            ? []
            : [
                {
                  key: "move",
                  label: tStorage("cardLocation.move"),
                  icon: <IconTransfer />,
                  disabled: isMoving,
                  onSelect: () => setMoveOpen(true),
                },
                {
                  key: "remove-from-location",
                  label: tStorage("cardLocation.remove"),
                  icon: <IconBoxOff />,
                  destructive: true,
                  disabled: isRemoving,
                  hotkeyId: "cardRemove",
                  onSelect: () => setConfirmRemoveOpen(true),
                },
              ]
        }
      />
      <MoveToLocationDialog
        open={moveOpen}
        count={1}
        excludedLocationGuid={location.guid}
        isMoving={isMoving}
        onOpenChange={setMoveOpen}
        onMove={moveToLocation}
      />
      <RemoveFromLocationDialog
        open={confirmRemoveOpen}
        onOpenChange={setConfirmRemoveOpen}
        cardName={stored.card.name}
        locationName={location.name}
        collectionName={stored.collectionName}
        focusConfirm
        onConfirm={removeFromLocation}
      />
    </CardDetailScopeContext>
  );
}
