import { Callout } from "@/components/callout";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useReviewGridActions } from "@/features/cards/api/use-review-grid-actions";
import { ReviewGridCorrectionDialog } from "@/features/cards/components/review-grid-correction-dialog";
import { ReviewGridTile } from "@/features/cards/components/review-grid-tile";
import { REVIEW_GRID_CLASS } from "@/lib/constants/card-grid";
import type { ReviewGridProps } from "@/lib/interfaces/cards";
import { toast } from "@/lib/toast";
import type { PlayingCard, ReviewGridCard } from "@magic-vault/shared";
import {
  IconChecks,
  IconLayoutGrid,
  IconListCheck,
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
  onOpenOneByOne,
  onClose,
  onCorrect,
}: ReviewGridProps) {
  const { t } = useTranslation("cards");
  const { acceptCards, correctCard } = useReviewGridActions();
  const [hiddenScanIds, setHiddenScanIds] = useState<Set<string>>(new Set());
  const [correctingCard, setCorrectingCard] = useState<ReviewGridCard | null>(
    null,
  );
  const visibleCards = cards.filter((card) => !hiddenScanIds.has(card.scanId));
  const remaining = Math.max(
    visibleCards.length,
    total - (cards.length - visibleCards.length),
  );

  const setHidden = (scanIds: string[], hidden: boolean) =>
    setHiddenScanIds((previous) => {
      const next = new Set(previous);
      for (const scanId of scanIds) {
        if (hidden) next.add(scanId);
        else next.delete(scanId);
      }
      return next;
    });

  const accept = async (cardsToAccept: ReviewGridCard[]) => {
    if (cardsToAccept.length === 0) return;
    setHidden(
      cardsToAccept.map((card) => card.scanId),
      true,
    );
    const failed = await acceptCards(cardsToAccept);
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
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b bg-background/80 p-2 backdrop-blur-2xl">
        <div className="mr-auto min-w-0">
          <h2 className="truncate text-base font-semibold">
            {t("reviewGrid.title")}
          </h2>
          <p className="text-xs tabular-nums text-foreground/70">
            {isLoading
              ? " "
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
          <Callout variant="error">{t("reviewGrid.loadFailed")}</Callout>
        ) : isLoading || (visibleCards.length === 0 && remaining > 0) ? (
          <div className={REVIEW_GRID_CLASS}>
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="flex flex-col gap-2 rounded-lg border p-2"
              >
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="aspect-[2.5/3.5] rounded-md" />
                  <Skeleton className="aspect-[2.5/3.5] rounded-md" />
                </div>
                <Skeleton className="h-4 w-2/3 rounded-sm" />
                <Skeleton className="h-7 rounded-md" />
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
                onAccept={() => void accept([card])}
                onCorrect={() => setCorrectingCard(card)}
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
