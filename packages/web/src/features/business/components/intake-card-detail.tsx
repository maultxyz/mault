import { DeleteDialog } from "@/components/delete-dialog";
import { HotkeyHint } from "@/components/hotkey-hint";
import { Button } from "@/components/ui/button";
import {
  businessKeys,
  intakeCardContextQueryOptions,
} from "@/features/business/api/business";
import { useIntakeCardActions } from "@/features/business/api/use-intake-card-actions";
import { CardDetailScopeContext } from "@/features/cards/api/use-card-detail-scope";
import {
  loadCollectionPositionStep,
  usePrefetchDetailCards,
} from "@/features/cards/api/use-prefetch-detail-cards";
import { CardDetailPanel } from "@/features/cards/components/card-detail-panel";
import { CardDetailPanelSkeleton } from "@/features/cards/components/card-detail-panel-skeleton";
import { collectionCardPositionQueryOptions } from "@/features/collections/api/collection-cards";
import { removeCollectionCard } from "@/features/collections/api/collections";
import { useCollections } from "@/features/collections/api/use-collections";
import { invalidateCollectionCards } from "@/features/collections/lib/card-page-cache";
import { useReviewSession } from "@/hooks/use-review-session";
import { CARD_LOOKUP_QUERY } from "@/lib/constants/card-filters";
import { DETAIL_PREFETCH_STALE_MS } from "@/lib/constants/cards";
import type { IntakeCardDetailProps } from "@/lib/interfaces/business";
import { toast } from "@/lib/toast";
import { IconX } from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function IntakeCardDetail({
  lot,
  scanId,
  reviewMode,
  onNavigate,
  onShowReviewGrid,
  onClose,
}: IntakeCardDetailProps) {
  const { t } = useTranslation("cards");
  const { t: tBusiness } = useTranslation("business");
  const queryClient = useQueryClient();
  const { collections } = useCollections();
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const { data: context, isPending } = useQuery(
    intakeCardContextQueryOptions(lot.guid, scanId, reviewMode),
  );

  const stored = context?.card ?? null;
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

  const { data: position, isPending: isPositionPending } = useQuery(
    collectionCardPositionQueryOptions(
      stored?.collectionGuid,
      scanId,
      CARD_LOOKUP_QUERY,
    ),
  );
  const scanned = position?.entry.scanId === scanId ? position.entry : null;
  const actions = useIntakeCardActions(stored);
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
        intakeCardContextQueryOptions(lot.guid, neighbor.scanId, reviewMode),
      );
      void queryClient.prefetchQuery(
        collectionCardPositionQueryOptions(
          neighbor.collectionGuid,
          neighbor.scanId,
          CARD_LOOKUP_QUERY,
        ),
      );
    }
  }, [next, previous, lot.guid, reviewMode, queryClient]);

  const loadPrefetchStep = useCallback(
    async (upcomingScanId: string) => {
      const nextContext = await queryClient.fetchQuery({
        ...intakeCardContextQueryOptions(lot.guid, upcomingScanId, reviewMode),
        staleTime: DETAIL_PREFETCH_STALE_MS,
      });
      if (!nextContext) return null;
      const step = await loadCollectionPositionStep(
        queryClient,
        nextContext.card.collectionGuid,
        upcomingScanId,
        CARD_LOOKUP_QUERY,
      );
      return step && { ...step, nextScanId: nextContext.next?.scanId ?? null };
    },
    [queryClient, lot.guid, reviewMode],
  );
  usePrefetchDetailCards(nextScanId, true, loadPrefetchStep);

  if (!context || !stored || !scanned) return <CardDetailPanelSkeleton />;

  const canRemove = lot.status === "open";

  const removeFromLot = async () => {
    setConfirmRemoveOpen(false);
    const result = await removeCollectionCard(
      stored.collectionGuid,
      scanId,
    ).catch(() => null);
    if (!result?.success) {
      toast.error(tBusiness("errors.generic"));
      return;
    }
    void queryClient.invalidateQueries({ queryKey: businessKeys.intakeRoot() });
    void invalidateCollectionCards(queryClient, stored.collectionGuid);
    if (reviewMode) reviewSession.forget(scanId);
    if (nextScanId) onNavigate(nextScanId);
    else onClose();
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
          canRemove ? () => setConfirmRemoveOpen(true) : undefined
        }
        footerActions={
          canRemove ? (
            <Button
              variant="destructive"
              onClick={() => setConfirmRemoveOpen(true)}
            >
              <IconX className="size-4" />
              {tBusiness("intake.review.remove")}
              <HotkeyHint id="cardRemove" />
            </Button>
          ) : undefined
        }
      />
      <DeleteDialog
        open={confirmRemoveOpen}
        onOpenChange={setConfirmRemoveOpen}
        title={tBusiness("intake.review.removeTitle", {
          name: stored.card.name,
        })}
        description={tBusiness("intake.review.removeDescription", {
          name: lot.customerName,
        })}
        confirmLabel={tBusiness("intake.review.remove")}
        focusConfirm
        onConfirm={() => void removeFromLot()}
      />
    </CardDetailScopeContext>
  );
}
