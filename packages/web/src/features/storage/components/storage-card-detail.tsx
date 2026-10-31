import { DeleteDialog } from "@/components/delete-dialog";
import { CardDetailScopeContext } from "@/features/cards/api/use-card-detail-scope";
import { CardDetailPanelSkeleton } from "@/features/cards/components/card-detail-panel-skeleton";
import { CardDetailPanel } from "@/features/cards/components/card-detail-panel";
import {
  loadCollectionPositionStep,
  usePrefetchDetailCards,
} from "@/features/cards/api/use-prefetch-detail-cards";
import { collectionCardPositionQueryOptions } from "@/features/collections/api/collection-cards";
import { useCollections } from "@/features/collections/api/use-collections";
import { storageLocationCardContextQueryOptions } from "@/features/storage/api/storage-locations";
import {
  useMoveCardsToLocation,
  useRemoveCardFromLocation,
  useStoredCardActions,
} from "@/features/storage/api/use-storage-locations";
import { MoveToLocationDialog } from "@/features/storage/components/move-to-location-dialog";
import { useStorageAccess } from "@/features/storage/api/use-storage-access";
import { useReviewSession } from "@/hooks/use-review-session";
import { CARD_LOOKUP_QUERY } from "@/lib/constants/card-filters";
import { DETAIL_PREFETCH_STALE_MS } from "@/lib/constants/cards";
import type { StorageCardDetailProps } from "@/lib/interfaces/storage";
import { toast } from "@/lib/toast";
import { IconBoxOff, IconTransfer } from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export function StorageCardDetail({
  location,
  scanId,
  reviewMode,
  onNavigate,
  onShowReviewGrid,
  onClose,
}: StorageCardDetailProps) {
  const { t } = useTranslation("cards");
  const { t: tStorage } = useTranslation("storage");
  const { removeCard, isRemoving } = useRemoveCardFromLocation();
  const { isLocked: storageLocked } = useStorageAccess();
  const { moveCards, isMoving } = useMoveCardsToLocation();
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const queryClient = useQueryClient();
  const { collections } = useCollections();
  const { data: context, isPending } = useQuery(
    storageLocationCardContextQueryOptions(location.guid, scanId, reviewMode),
  );

  const stored = context?.card;
  const previous = context?.previous;
  const next = context?.next;
  const total = context?.total ?? 0;
  const reviewSession = useReviewSession(scanId, reviewMode);
  const prevScanId = reviewMode
    ? reviewSession.previousScanId
    : (previous?.scanId ?? null);
  const nextScanId = reviewMode
    ? reviewSession.resolveNext(next?.scanId)
    : (next?.scanId ?? null);
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

  const { data: position, isPending: isPositionPending } = useQuery(
    collectionCardPositionQueryOptions(
      stored?.collectionGuid,
      scanId,
      CARD_LOOKUP_QUERY,
    ),
  );
  const scanned = position?.entry.scanId === scanId ? position.entry : null;
  const actions = useStoredCardActions(entry);
  const collection =
    collections.find((c) => c.guid === stored?.collectionGuid) ?? null;
  const isMissing =
    (!isPending && !stored) || (!!stored && !isPositionPending && !scanned);

  useEffect(() => {
    if (isMissing) onClose();
  }, [isMissing, onClose]);

  useEffect(() => {
    for (const neighbor of [next, previous]) {
      if (!neighbor) continue;
      void queryClient.prefetchQuery(
        storageLocationCardContextQueryOptions(
          location.guid,
          neighbor.scanId,
          reviewMode,
        ),
      );
      void queryClient.prefetchQuery(
        collectionCardPositionQueryOptions(
          neighbor.collectionGuid,
          neighbor.scanId,
          CARD_LOOKUP_QUERY,
        ),
      );
    }
  }, [next, previous, location.guid, reviewMode, queryClient]);

  const loadPrefetchStep = useCallback(
    async (nextScanId: string) => {
      const nextContext = await queryClient.fetchQuery({
        ...storageLocationCardContextQueryOptions(
          location.guid,
          nextScanId,
          reviewMode,
        ),
        staleTime: DETAIL_PREFETCH_STALE_MS,
      });
      if (!nextContext) return null;
      const step = await loadCollectionPositionStep(
        queryClient,
        nextContext.card.collectionGuid,
        nextScanId,
        CARD_LOOKUP_QUERY,
      );
      return step && { ...step, nextScanId: nextContext.next?.scanId ?? null };
    },
    [queryClient, location.guid, reviewMode],
  );
  usePrefetchDetailCards(nextScanId, true, loadPrefetchStep);

  if (!context || !stored || !scanned) return <CardDetailPanelSkeleton />;

  const leaveCard = () => {
    if (reviewMode) reviewSession.forget(scanId);
    if (nextScanId) onNavigate(nextScanId);
    else onClose();
  };

  const removeFromLocation = () => {
    setConfirmRemoveOpen(false);
    void removeCard(location.guid, scanId);
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
        isFoil={stored.isFoil}
        foilType={stored.foilType ?? undefined}
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
      <DeleteDialog
        open={confirmRemoveOpen}
        onOpenChange={setConfirmRemoveOpen}
        title={tStorage("removeDialog.title", {
          name: stored.card.name,
          location: location.name,
        })}
        description={tStorage("removeDialog.description")}
        confirmLabel={tStorage("removeDialog.confirm")}
        focusConfirm
        onConfirm={removeFromLocation}
      />
    </CardDetailScopeContext>
  );
}
