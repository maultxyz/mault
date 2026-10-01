import { CardDetailPanel } from "@/features/cards/components/card-detail-panel";
import { collectionCardPositionQueryOptions } from "@/features/collections/api/collection-cards";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import type { MonitorCardDetailProps } from "@/lib/interfaces/scanner";
import { IconLoader2 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export function MonitorCardDetail({
  collectionGuid,
  scanId,
  cardsQuery,
  onNavigate,
  onClose,
}: MonitorCardDetailProps) {
  const { removeCard } = useScannedCards();
  const { data: position, isPending } = useQuery(
    collectionCardPositionQueryOptions(collectionGuid, scanId, cardsQuery),
  );
  const entry = position?.entry.scanId === scanId ? position.entry : null;
  const isMissing = !isPending && !entry;

  useEffect(() => {
    if (isMissing) onClose();
  }, [isMissing, onClose]);

  if (!entry) {
    return (
      <div className="flex items-center justify-center h-32 text-foreground/70">
        <IconLoader2 size={16} className="animate-spin" />
      </div>
    );
  }

  return (
    <CardDetailPanel
      scanId={entry.scanId}
      currentCard={entry.card}
      alternativeMatches={entry.alternativeMatches}
      needsReview={entry.needsReview}
      wasCorrected={entry.corrected}
      isFoil={entry.isFoil}
      foilType={entry.foilType}
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
