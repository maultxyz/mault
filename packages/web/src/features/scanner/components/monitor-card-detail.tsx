import { CardDetailPanelSkeleton } from "@/features/cards/components/card-detail-panel-skeleton";
import { CardDetailPanel } from "@/features/cards/components/card-detail-panel";
import {
  loadCollectionPositionStep,
  usePrefetchDetailCards,
} from "@/features/cards/api/use-prefetch-detail-cards";
import { collectionCardPositionQueryOptions } from "@/features/collections/api/collection-cards";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import type { MonitorCardDetailProps } from "@/lib/interfaces/scanner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

export function MonitorCardDetail({
  collectionGuid,
  scanId,
  cardsQuery,
  onNavigate,
  onClose,
}: MonitorCardDetailProps) {
  const { removeCard } = useScannedCards();
  const queryClient = useQueryClient();
  const { data: position, isPending } = useQuery(
    collectionCardPositionQueryOptions(collectionGuid, scanId, cardsQuery),
  );
  const entry = position?.entry.scanId === scanId ? position.entry : null;
  const isMissing = !isPending && !entry;
  const loadPrefetchStep = useCallback(
    (nextScanId: string) =>
      loadCollectionPositionStep(
        queryClient,
        collectionGuid,
        nextScanId,
        cardsQuery,
      ),
    [queryClient, collectionGuid, cardsQuery],
  );
  usePrefetchDetailCards(
    entry ? position?.nextScanId : null,
    true,
    loadPrefetchStep,
  );

  useEffect(() => {
    if (isMissing) onClose();
  }, [isMissing, onClose]);

  if (!entry) {
    return <CardDetailPanelSkeleton />;
  }

  return (
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
      binNumber={entry.binNumber}
      onClose={onClose}
      onRemove={() => {
        removeCard(entry.scanId);
        onClose();
      }}
      onPrev={() => onNavigate(position?.prevScanId ?? null)}
      onNext={() => onNavigate(position?.nextScanId ?? null)}
      hasPrev={!!position?.prevScanId}
      hasNext={!!position?.nextScanId}
      currentIndex={position?.index ?? 0}
      total={position?.total ?? 0}
      copyIndex={position?.copyIndex ?? -1}
      copyCount={position?.copyCount ?? 1}
    />
  );
}
