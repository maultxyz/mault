import type { IntakeCardContext } from "@magic-vault/shared";
import { DeleteDialog } from "@/components/delete-dialog";
import {
  businessKeys,
  intakeCardContextQueryOptions,
} from "@/features/business/api/business";
import { useIntakeCardActions } from "@/features/business/api/use-intake-card-actions";
import { CardDetailScopeContext } from "@/features/cards/api/use-card-detail-scope";
import { useCardContextNavigation } from "@/features/cards/api/use-card-context-navigation";
import { CardDetailPanel } from "@/features/cards/components/card-detail-panel";
import { CardDetailPanelSkeleton } from "@/features/cards/components/card-detail-panel-skeleton";
import { removeCollectionCard } from "@/features/collections/api/collections";
import { useCollections } from "@/features/collections/api/use-collections";
import { invalidateCollectionCards } from "@/features/collections/lib/card-page-cache";
import type { IntakeCardDetailProps } from "@/lib/interfaces/business";
import { toast } from "@/lib/toast";
import { IconX } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
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
  const contextQueryOptionsFor = useCallback(
    (contextScanId: string) =>
      intakeCardContextQueryOptions(lot.guid, contextScanId, reviewMode),
    [lot.guid, reviewMode],
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
    IntakeCardContext,
    ReturnType<typeof businessKeys.intakeCard>
  >(
    contextQueryOptionsFor,
    scanId,
    reviewMode,
    onClose,
  );
  const actions = useIntakeCardActions(stored);
  const collection =
    collections.find((c) => c.guid === stored?.collectionGuid) ?? null;

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
        onShowReviewGrid={onShowReviewGrid}
        onReviewComplete={() => {
          toast.success(t("review.complete", { count: total }));
          onClose();
        }}
        onRemoveShortcut={
          canRemove ? () => setConfirmRemoveOpen(true) : undefined
        }
        extraActions={
          canRemove
            ? [
                {
                  key: "remove-from-intake",
                  label: tBusiness("intake.review.remove"),
                  icon: <IconX />,
                  destructive: true,
                  hotkeyId: "cardRemove",
                  onSelect: () => setConfirmRemoveOpen(true),
                },
              ]
            : undefined
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
