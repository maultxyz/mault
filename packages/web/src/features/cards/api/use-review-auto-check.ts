import { useBilling } from "@/features/billing/api/use-billing";
import { useReviewGridActions } from "@/features/cards/api/use-review-grid-actions";
import { autoCheckCollectionReviewCards } from "@/features/collections/api/collections";
import type { ReviewAutoCheckProgress } from "@/lib/interfaces/cards";
import { toast } from "@/lib/toast";
import {
  countReviewAutoCheckVerdicts,
  runReviewAutoCheck,
  type ReviewAutoCheckOutcome,
  type ReviewGridCard,
} from "@magic-vault/shared";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export function useReviewAutoCheck(
  cards: ReviewGridCard[],
  onConfirmed: (scanIds: string[]) => void,
) {
  const { t } = useTranslation("cards");
  const { billing } = useBilling();
  const isAvailable = billing?.reviewAutoCheck === true;
  const { refreshReviewedCards } = useReviewGridActions();
  const [outcomes, setOutcomes] = useState<
    ReadonlyMap<string, ReviewAutoCheckOutcome>
  >(new Map());
  const [progress, setProgress] = useState<ReviewAutoCheckProgress | null>(
    null,
  );
  const isUnmountedRef = useRef(false);
  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
    };
  }, []);

  const uncheckedCards = cards.filter((card) => !outcomes.has(card.scanId));

  const run = async () => {
    if (progress || uncheckedCards.length === 0) return;
    const cardsToCheck = uncheckedCards;
    const runOutcomes: ReviewAutoCheckOutcome[] = [];
    setProgress({ checked: 0, total: cardsToCheck.length });
    try {
      await runReviewAutoCheck({
        cards: cardsToCheck,
        checkCollectionCards: async (collectionGuid, scanIds) => {
          const result = await autoCheckCollectionReviewCards(
            collectionGuid,
            scanIds,
          );
          setProgress((previous) =>
            previous
              ? { ...previous, checked: previous.checked + scanIds.length }
              : previous,
          );
          return result;
        },
        onOutcomes: (batch) => {
          runOutcomes.push(...batch);
          setOutcomes((previous) => {
            const next = new Map(previous);
            for (const outcome of batch) next.set(outcome.scanId, outcome);
            return next;
          });
          onConfirmed(
            batch
              .filter((outcome) => outcome.verdict === "confirmed")
              .map((outcome) => outcome.scanId),
          );
        },
        isCancelled: () => isUnmountedRef.current,
      });
      if (isUnmountedRef.current) return;
      const counts = countReviewAutoCheckVerdicts(runOutcomes);
      toast.success(
        t("reviewGrid.autoCheckComplete", {
          count: counts.confirmed,
          needsLook: counts.different + counts.unsure,
        }),
      );
    } catch (err) {
      console.error("Failed to auto-check review cards:", err);
      if (!isUnmountedRef.current) toast.error(t("reviewGrid.autoCheckFailed"));
    } finally {
      refreshReviewedCards(cardsToCheck.map((card) => card.collectionGuid));
      if (!isUnmountedRef.current) setProgress(null);
    }
  };

  return {
    isAvailable,
    outcomes,
    progress,
    uncheckedCount: uncheckedCards.length,
    run,
  };
}
