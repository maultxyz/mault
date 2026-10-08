import { DeleteDialog } from "@/components/delete-dialog";
import { HotkeyHint } from "@/components/hotkey-hint";
import { Button } from "@/components/ui/button";
import { CardDetailScopeContext } from "@/features/cards/api/use-card-detail-scope";
import { CardDetailPanelSkeleton } from "@/features/cards/components/card-detail-panel-skeleton";
import { CardDetailPanel } from "@/features/cards/components/card-detail-panel";
import { collectionCardPositionQueryOptions } from "@/features/collections/api/collection-cards";
import { useCollections } from "@/features/collections/api/use-collections";
import { storageLocationCardsQueryOptions } from "@/features/storage/api/storage-locations";
import {
  useRemoveCardFromLocation,
  useStoredCardActions,
} from "@/features/storage/api/use-storage-locations";
import { ALL_CARDS_QUERY } from "@/lib/constants/card-filters";
import type { StorageCardDetailProps } from "@/lib/interfaces/storage";
import { toast } from "@/lib/toast";
import { IconBoxOff } from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export function StorageCardDetail({
  location,
  scanId,
  reviewMode,
  onNavigate,
  onClose,
}: StorageCardDetailProps) {
  const { t } = useTranslation("cards");
  const { t: tStorage } = useTranslation("storage");
  const { removeCard, isRemoving } = useRemoveCardFromLocation();
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const queryClient = useQueryClient();
  const { collections } = useCollections();
  const { data: cards = [], isPending } = useQuery(
    storageLocationCardsQueryOptions(location.guid),
  );

  const index = cards.findIndex((card) => card.scanId === scanId);
  const stored = index >= 0 ? cards[index] : undefined;
  const previous = index > 0 ? cards[index - 1] : undefined;
  const next = index >= 0 ? cards[index + 1] : undefined;
  const entry = useMemo(
    () =>
      stored
        ? { ...stored, locationGuid: location.guid, locationName: location.name }
        : null,
    [stored, location.guid, location.name],
  );

  const { data: position, isPending: isPositionPending } = useQuery(
    collectionCardPositionQueryOptions(
      stored?.collectionGuid,
      scanId,
      ALL_CARDS_QUERY,
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
    if (!next) return;
    void queryClient.prefetchQuery(
      collectionCardPositionQueryOptions(
        next.collectionGuid,
        next.scanId,
        ALL_CARDS_QUERY,
      ),
    );
  }, [next, queryClient]);

  if (!stored || !scanned) return <CardDetailPanelSkeleton />;

  const removeFromLocation = () => {
    setConfirmRemoveOpen(false);
    void removeCard(location.guid, scanId);
    if (next) onNavigate(next.scanId);
    else onClose();
  };

  return (
    <CardDetailScopeContext value={{ collection, actions }}>
      <CardDetailPanel
        scanId={scanId}
        currentCard={stored.card}
        alternativeMatches={scanned.alternativeMatches}
        needsReview={stored.needsReview}
        wasCorrected={stored.corrected}
        isFoil={stored.isFoil}
        foilType={stored.foilType ?? undefined}
        binNumber={scanned.binNumber}
        onClose={onClose}
        onPrev={() => previous && onNavigate(previous.scanId)}
        onNext={() => next && onNavigate(next.scanId)}
        hasPrev={!!previous}
        hasNext={!!next}
        currentIndex={index}
        total={cards.length}
        reviewMode={reviewMode}
        onReviewComplete={() => {
          toast.success(t("review.complete", { count: cards.length }));
          onClose();
        }}
        onRemoveShortcut={() => setConfirmRemoveOpen(true)}
        footerActions={
          <Button
            variant="destructive"
            disabled={isRemoving}
            onClick={() => setConfirmRemoveOpen(true)}
          >
            <IconBoxOff className="size-4" />
            {tStorage("cardLocation.remove")}
            <HotkeyHint id="cardRemove" />
          </Button>
        }
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
