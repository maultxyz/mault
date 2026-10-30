import { CardDetailPanel } from "@/features/cards/components/card-detail-panel";
import { CardDetailPanelSkeleton } from "@/features/cards/components/card-detail-panel-skeleton";
import { DrawerTitle } from "@/components/ui/drawer";
import { MobileCardDrawer } from "@/features/cards/components/mobile-card-drawer";
import {
  loadCollectionPositionStep,
  usePrefetchDetailCards,
} from "@/features/cards/api/use-prefetch-detail-cards";
import { CardDetailScopeContext } from "@/features/cards/api/use-card-detail-scope";
import { collectionCardPositionQueryOptions } from "@/features/collections/api/collection-cards";
import { useCollectionCardActions } from "@/features/collections/api/use-collection-card-actions";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useReviewSession } from "@/hooks/use-review-session";
import { CARD_LOOKUP_QUERY } from "@/lib/constants/card-filters";
import { MONITOR_NEEDS_REVIEW_CARDS_QUERY } from "@/lib/constants/scanner";
import type {
  MobileCardDetailBodyProps,
  MobileCardDetailDrawerProps,
} from "@/lib/interfaces/scanner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function MobileCardDetailDrawer({
  collectionGuid,
  collection,
  canEditCards,
  scanId,
  reviewMode = false,
  onNavigate,
  onReviewComplete,
  onShowReviewGrid,
  onClose,
}: MobileCardDetailDrawerProps) {
  const [shownScanId, setShownScanId] = useState(scanId);
  if (scanId && scanId !== shownScanId) setShownScanId(scanId);
  const reviewSession = useReviewSession(scanId, reviewMode);

  return (
    <MobileCardDrawer open={!!scanId} onClose={onClose}>
      {shownScanId && (
        <MobileCardDetailBody
          key={shownScanId}
          collectionGuid={collectionGuid}
          collection={collection}
          canEditCards={canEditCards}
          scanId={shownScanId}
          reviewMode={reviewMode}
          reviewSession={reviewSession}
          onNavigate={onNavigate}
          onReviewComplete={onReviewComplete}
          onShowReviewGrid={onShowReviewGrid}
          onClose={onClose}
        />
      )}
    </MobileCardDrawer>
  );
}

function MobileCardDetailBody({
  collectionGuid,
  collection,
  canEditCards,
  scanId,
  reviewMode,
  reviewSession,
  onNavigate,
  onReviewComplete,
  onShowReviewGrid,
  onClose,
}: MobileCardDetailBodyProps) {
  const { t } = useTranslation("cards");
  const { removeCard } = useScannedCards();
  const collectionCardActions = useCollectionCardActions(collectionGuid);
  const queryClient = useQueryClient();
  const query = reviewMode
    ? MONITOR_NEEDS_REVIEW_CARDS_QUERY
    : CARD_LOOKUP_QUERY;
  const { data: position, isPending } = useQuery(
    collectionCardPositionQueryOptions(collectionGuid, scanId, query),
  );
  const entry = position?.entry.scanId === scanId ? position.entry : null;
  const isMissing = !isPending && !entry;
  const prevScanId = reviewMode
    ? reviewSession.previousScanId
    : (position?.prevScanId ?? null);
  const nextScanId = reviewMode
    ? reviewSession.resolveNext(position?.nextScanId)
    : (position?.nextScanId ?? null);
  const loadPrefetchStep = useCallback(
    (nextScanId: string) =>
      loadCollectionPositionStep(
        queryClient,
        collectionGuid,
        nextScanId,
        query,
      ),
    [queryClient, collectionGuid, query],
  );
  usePrefetchDetailCards(entry ? nextScanId : null, true, loadPrefetchStep);

  useEffect(() => {
    if (isMissing && !reviewMode) onClose();
  }, [isMissing, reviewMode, onClose]);

  if (!entry) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <DrawerTitle className="sr-only">
          {t("cardDetailPanel.cardDetailsFallback")}
        </DrawerTitle>
        <CardDetailPanelSkeleton />
      </div>
    );
  }

  const panel = (
    <CardDetailPanel
      scanId={entry.scanId}
      currentCard={entry.card}
      alternativeMatches={entry.alternativeMatches}
      lowConfidenceMatch={entry.lowConfidenceMatch}
      wasCorrected={entry.corrected}
      isReviewed={entry.reviewed}
      storageLocation={entry.storageLocation}
      isFoil={entry.isFoil}
      foilType={entry.foilType}
      condition={entry.condition}
      language={entry.language}
      binNumber={entry.binNumber}
      onClose={onClose}
      onRemove={
        canEditCards
          ? () => {
              removeCard(entry.scanId);
              if (reviewMode) reviewSession.forget(entry.scanId);
              if (reviewMode && nextScanId) onNavigate(nextScanId);
              else onClose();
            }
          : undefined
      }
      onPrev={() => onNavigate(prevScanId)}
      onNext={() => onNavigate(nextScanId)}
      hasPrev={!!prevScanId}
      hasNext={!!nextScanId}
      currentIndex={position?.index ?? 0}
      total={position?.total ?? 0}
      copyIndex={position?.copyIndex ?? -1}
      copyCount={position?.copyCount ?? 1}
      reviewMode={reviewMode}
      onReviewComplete={() => onReviewComplete(position?.total ?? 0)}
      onShowReviewGrid={onShowReviewGrid}
    />
  );

  return (
    <div data-vaul-no-drag className="flex min-h-0 flex-1 flex-col">
      <DrawerTitle className="sr-only">{entry.card.name}</DrawerTitle>
      {canEditCards ? (
        panel
      ) : (
        <CardDetailScopeContext
          value={{ collection, actions: collectionCardActions }}
        >
          {panel}
        </CardDetailScopeContext>
      )}
    </div>
  );
}
