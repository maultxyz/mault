import { LoadErrorCallout } from "@/components/load-error-callout";
import { Callout } from "@/components/callout";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useReviewAutoCheck } from "@/features/cards/api/use-review-auto-check";
import { useReviewGridActions } from "@/features/cards/api/use-review-grid-actions";
import { ReviewGridCorrectionDialog } from "@/features/cards/components/review-grid-correction-dialog";
import { ReviewGridTile } from "@/features/cards/components/review-grid-tile";
import { REVIEW_GRID_CLASS } from "@/lib/constants/card-grid";
import type { ReviewGridProps } from "@/lib/interfaces/cards";
import { toast } from "@/lib/toast";
import {
  reviewGridAttributesOf,
  reviewGridAttributeUpdate,
  type PlayingCard,
  type ReviewGridAttributes,
  type ReviewGridAttributeUpdate,
  type ReviewGridCard,
} from "@magic-vault/shared";
import {
  IconChecks,
  IconLayoutGrid,
  IconListCheck,
  IconLoader2,
  IconPlayerPause,
  IconPlayerPlay,
  IconSparkles,
  IconSquareCheck,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function ReviewGrid({
  cards,
  total,
  isLoading,
  isError,
  onRetry,
  onOpenOneByOne,
  onClose,
  onCorrect,
  loadReviewCardPage,
}: ReviewGridProps) {
  const { t } = useTranslation("cards");
  const { acceptCards, correctCard } = useReviewGridActions();
  const [hiddenScanIds, setHiddenScanIds] = useState<Set<string>>(new Set());
  const [correctingCard, setCorrectingCard] = useState<ReviewGridCard | null>(
    null,
  );
  const [attributeDrafts, setAttributeDrafts] = useState<
    Record<string, ReviewGridAttributes>
  >({});
  const setHidden = (scanIds: string[], hidden: boolean) =>
    setHiddenScanIds((previous) => {
      const next = new Set(previous);
      for (const scanId of scanIds) {
        if (hidden) next.add(scanId);
        else next.delete(scanId);
      }
      return next;
    });
  const autoCheck = useReviewAutoCheck({
    cards,
    hiddenScanIds,
    remainingTotal: total,
    loadReviewCardPage,
    onConfirmed: (scanIds) => setHidden(scanIds, true),
  });
  const allCards = autoCheck.cards;
  const visibleCards = allCards.filter(
    (card) => !hiddenScanIds.has(card.scanId),
  );
  const savedAttributesOf = (card: ReviewGridCard) =>
    reviewGridAttributesOf(card, t("foil"));
  const attributesOf = (card: ReviewGridCard) =>
    attributeDrafts[card.scanId] ?? savedAttributesOf(card);
  const remaining = Math.max(
    visibleCards.length,
    total - (allCards.length - visibleCards.length),
  );

  const firstAutoCheckingScanId = visibleCards.find((card) =>
    autoCheck.checkingScanIds.has(card.scanId),
  )?.scanId;

  const accept = async (cardsToAccept: ReviewGridCard[]) => {
    if (cardsToAccept.length === 0) return;
    setHidden(
      cardsToAccept.map((card) => card.scanId),
      true,
    );
    const attributeUpdates = new Map<string, ReviewGridAttributeUpdate>();
    for (const card of cardsToAccept) {
      const update = reviewGridAttributeUpdate(
        savedAttributesOf(card),
        attributeDrafts[card.scanId],
      );
      if (update) attributeUpdates.set(card.scanId, update);
    }
    const failed = await acceptCards(cardsToAccept, attributeUpdates);
    if (failed.length === 0) return;
    setHidden(
      failed.map((card) => card.scanId),
      false,
    );
    toast.error(t("reviewGrid.acceptFailed", { count: failed.length }));
  };

  const applyCorrection = async (
    card: ReviewGridCard,
    correctedCard: PlayingCard,
  ) => {
    setCorrectingCard(null);
    setHidden([card.scanId], true);
    if (onCorrect) {
      onCorrect(card, correctedCard);
      return;
    }
    if (await correctCard(card, correctedCard)) return;
    setHidden([card.scanId], false);
    toast.error(t("reviewGrid.correctFailed"));
  };

  return (
    <div className="flex min-h-full shrink-0 flex-col">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1.5 border-b bg-background/80 p-2 backdrop-blur-2xl">
        <div className="mr-auto min-w-0">
          <h2 className="truncate font-heading text-base font-semibold">
            {t("reviewGrid.title")}
          </h2>
          <p role="status" className="text-xs tabular-nums text-foreground/70">
            {isLoading
              ? " "
              : autoCheck.status === "running" && autoCheck.progress
                ? t("reviewGrid.autoChecking", {
                    checked: autoCheck.progress.checked,
                    total: autoCheck.progress.total,
                  })
                : autoCheck.status === "pausing"
                  ? t("reviewGrid.autoCheckPausing")
                  : autoCheck.status === "paused" && autoCheck.progress
                    ? t("reviewGrid.autoCheckPaused", {
                    checked: autoCheck.progress.checked,
                    total: autoCheck.progress.total,
                  })
                    : t("reviewGrid.remaining", { count: remaining })}
          </p>
        </div>
        <ButtonGroup>
          <Button variant="outline-selected" aria-pressed>
            <IconLayoutGrid />
            {t("reviewGrid.layoutGrid")}
          </Button>
          <Button
            variant="outline"
            aria-pressed={false}
            disabled={visibleCards.length === 0}
            onClick={() => visibleCards[0] && onOpenOneByOne(visibleCards[0])}
          >
            <IconListCheck />
            {t("reviewGrid.layoutOneByOne")}
          </Button>
        </ButtonGroup>
        {autoCheck.isAvailable &&
          (autoCheck.status === "running" || autoCheck.status === "pausing" ? (
            <Button
              variant="outline"
              disabled={autoCheck.status === "pausing"}
              onClick={autoCheck.pause}
            >
              {autoCheck.status === "pausing" ? (
                <IconLoader2 className="animate-spin motion-reduce:animate-none" />
              ) : (
                <IconPlayerPause />
              )}
              {t("reviewGrid.autoCheckPause")}
            </Button>
          ) : (
            <Button
              variant="outline"
              disabled={!autoCheck.canRun}
              onClick={() => void autoCheck.run()}
              title={t("reviewGrid.autoCheckHint")}
            >
              {autoCheck.status === "paused" ? <IconPlayerPlay /> : <IconSparkles />}
              {autoCheck.status === "paused"
                ? t("reviewGrid.autoCheckResume")
                : t("reviewGrid.autoCheck")}
            </Button>
          ))}
        <Button
          disabled={visibleCards.length === 0}
          onClick={() => void accept(visibleCards)}
        >
          <IconChecks />
          {t("reviewGrid.acceptAll", { count: visibleCards.length })}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          aria-label={t("reviewGrid.close")}
          title={t("reviewGrid.close")}
        >
          <IconX />
        </Button>
      </div>
      <div className="flex-1 p-2">
        {isError ? (
          onRetry ? (
            <LoadErrorCallout message={t("reviewGrid.loadFailed")} onRetry={onRetry} />
          ) : (
            <Callout variant="error">{t("reviewGrid.loadFailed")}</Callout>
          )
        ) : isLoading || (visibleCards.length === 0 && remaining > 0) ? (
          <div role="status" aria-busy="true" className={REVIEW_GRID_CLASS}>
            <span className="sr-only">{t("a11y.loading", { ns: "common" })}</span>
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="flex min-w-0 flex-col gap-2 rounded-card bg-card p-2"
              >
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 2 }).map((_, image) => (
                    <div key={image} className="flex min-w-0 flex-col gap-1">
                      <Skeleton className="h-2.5 w-14 rounded-sm" />
                      <Skeleton className="aspect-[2.5/3.5] rounded-lg" />
                    </div>
                  ))}
                </div>
                <div className="flex min-w-0 flex-col gap-1 px-0.5">
                  <Skeleton className="h-3.5 w-2/3 rounded-sm" />
                  <Skeleton className="h-3 w-1/3 rounded-sm" />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {Array.from({ length: 3 }).map((_, field) => (
                    <div key={field} className="flex min-w-0 flex-col gap-1">
                      <Skeleton className="h-2.5 w-12 rounded-sm" />
                      <Skeleton className="h-7 w-full rounded-lg max-md:h-11" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <Skeleton className="h-7 flex-1 rounded-lg max-md:h-10" />
                  <Skeleton className="h-7 flex-1 rounded-lg max-md:h-10" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleCards.length === 0 ? (
          <EmptyState
            icon={IconSquareCheck}
            title={t("reviewGrid.doneTitle")}
            description={t("reviewGrid.doneDescription")}
            action={
              <Button variant="outline" onClick={onClose}>
                {t("reviewGrid.done")}
              </Button>
            }
          />
        ) : (
          <div className={REVIEW_GRID_CLASS}>
            {visibleCards.map((card) => (
              <ReviewGridTile
                key={card.scanId}
                card={card}
                attributes={attributesOf(card)}
                onAttributesChange={(attributes) =>
                  setAttributeDrafts((previous) => ({
                    ...previous,
                    [card.scanId]: attributes,
                  }))
                }
                onAccept={() => void accept([card])}
                onCorrect={() => setCorrectingCard(card)}
                autoCheckOutcome={autoCheck.outcomes.get(card.scanId)}
                isAutoChecking={autoCheck.checkingScanIds.has(card.scanId)}
                followsAutoCheck={card.scanId === firstAutoCheckingScanId}
              />
            ))}
          </div>
        )}
      </div>
      <ReviewGridCorrectionDialog
        card={correctingCard}
        onSelect={(card, correctedCard) =>
          void applyCorrection(card, correctedCard)
        }
        onClose={() => setCorrectingCard(null)}
      />
    </div>
  );
}
