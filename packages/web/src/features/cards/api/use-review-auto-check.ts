import { useBilling } from "@/features/billing/api/use-billing";
import { useReviewGridActions } from "@/features/cards/api/use-review-grid-actions";
import { autoCheckCollectionReviewCards } from "@/features/collections/api/collections";
import { toast } from "@/lib/toast";
import {
  countReviewAutoCheckVerdicts,
  runReviewAutoCheck,
  type ReviewAutoCheckOutcome,
  type ReviewAutoCheckProgress,
  type ReviewAutoCheckStatus,
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
  const { refreshReviewedCards } = useReviewGridActions();
  const [status, setStatus] = useState<ReviewAutoCheckStatus>("idle");
  const [progress, setProgress] = useState<ReviewAutoCheckProgress | null>(
    null,
  );
  const [outcomes, setOutcomes] = useState<
    ReadonlyMap<string, ReviewAutoCheckOutcome>
  >(new Map());
  const [checkingScanIds, setCheckingScanIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const isPauseRequestedRef = useRef(false);
  const jobOutcomesRef = useRef<ReviewAutoCheckOutcome[]>([]);
  const isUnmountedRef = useRef(false);
  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
    };
  }, []);

  const uncheckedCards = cards.filter((card) => !outcomes.has(card.scanId));
  const currentStatus: ReviewAutoCheckStatus =
    status === "paused" && uncheckedCards.length === 0 ? "idle" : status;

  const run = async () => {
    if (currentStatus === "running" || currentStatus === "pausing") return;
    if (uncheckedCards.length === 0) return;
    const cardsToCheck = uncheckedCards;
    const isResuming = currentStatus === "paused";
    if (!isResuming) jobOutcomesRef.current = [];
    isPauseRequestedRef.current = false;
    setStatus("running");
    setProgress((previous) => {
      const checked = isResuming && previous ? previous.checked : 0;
      return { checked, total: checked + cardsToCheck.length };
    });
    let sentCount = 0;
    let hasFailed = false;
    try {
      await runReviewAutoCheck({
        cards: cardsToCheck,
        checkCollectionCards: async (collectionGuid, scanIds) => {
          const result = await autoCheckCollectionReviewCards(
            collectionGuid,
            scanIds,
          );
          sentCount += scanIds.length;
          setProgress((previous) =>
            previous
              ? { ...previous, checked: previous.checked + scanIds.length }
              : previous,
          );
          return result;
        },
        onBatchStart: (scanIds) => setCheckingScanIds(new Set(scanIds)),
        onOutcomes: (batch) => {
          jobOutcomesRef.current.push(...batch);
          setOutcomes((previous) => {
            const next = new Map(previous);
            for (const outcome of batch) next.set(outcome.scanId, outcome);
            return next;
          });
          setCheckingScanIds(new Set());
          onConfirmed(
            batch
              .filter((outcome) => outcome.verdict === "confirmed")
              .map((outcome) => outcome.scanId),
          );
        },
        isCancelled: () =>
          isUnmountedRef.current || isPauseRequestedRef.current,
      });
    } catch (err) {
      console.error("Failed to auto-check review cards:", err);
      hasFailed = true;
    }
    refreshReviewedCards(cardsToCheck.map((card) => card.collectionGuid));
    if (isUnmountedRef.current) return;
    setCheckingScanIds(new Set());
    if (hasFailed) {
      setStatus("paused");
      toast.error(t("reviewGrid.autoCheckFailed"));
      return;
    }
    if (sentCount < cardsToCheck.length) {
      setStatus("paused");
      return;
    }
    setStatus("idle");
    setProgress(null);
    const counts = countReviewAutoCheckVerdicts(jobOutcomesRef.current);
    toast.success(
      t("reviewGrid.autoCheckComplete", {
        count: counts.confirmed,
        needsLook: counts.different + counts.unsure,
      }),
    );
  };

  const pause = () => {
    if (currentStatus !== "running") return;
    isPauseRequestedRef.current = true;
    setStatus("pausing");
  };

  return {
    isAvailable: billing?.reviewAutoCheck === true,
    status: currentStatus,
    progress: currentStatus === "idle" ? null : progress,
    outcomes,
    checkingScanIds,
    uncheckedCount: uncheckedCards.length,
    run,
    pause,
  };
}
