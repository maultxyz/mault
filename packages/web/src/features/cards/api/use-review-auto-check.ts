import { useBilling } from "@/features/billing/api/use-billing";
import { useReviewGridActions } from "@/features/cards/api/use-review-grid-actions";
import { autoCheckCollectionReviewCards } from "@/features/collections/api/collections";
import type { ReviewAutoCheckOptions } from "@/lib/interfaces/cards";
import { toast } from "@/lib/toast";
import {
  countReviewAutoCheckVerdicts,
  loadUnseenReviewCards,
  ReviewAutoCheckRevealPacer,
  runReviewAutoCheck,
  type ReviewAutoCheckOutcome,
  type ReviewAutoCheckProgress,
  type ReviewAutoCheckStatus,
  type ReviewGridCard,
} from "@magic-vault/shared";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

function withoutDuplicateCards(cards: ReviewGridCard[]): ReviewGridCard[] {
  const seen = new Set<string>();
  return cards.filter((card) => {
    if (seen.has(card.scanId)) return false;
    seen.add(card.scanId);
    return true;
  });
}

export function useReviewAutoCheck({
  cards,
  hiddenScanIds,
  remainingTotal,
  loadReviewCardPage,
  onConfirmed,
}: ReviewAutoCheckOptions) {
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
  const [loadedCards, setLoadedCards] = useState<ReviewGridCard[]>([]);
  const allCards = withoutDuplicateCards([...cards, ...loadedCards]);

  const pageCardsRef = useRef(cards);
  const loadedCardsRef = useRef(loadedCards);
  const hiddenScanIdsRef = useRef(hiddenScanIds);
  const sentScanIdsRef = useRef(new Set<string>());
  const isPauseRequestedRef = useRef(false);
  const jobOutcomesRef = useRef<ReviewAutoCheckOutcome[]>([]);
  const isUnmountedRef = useRef(false);
  const revealPacerRef = useRef<ReviewAutoCheckRevealPacer | null>(null);
  useEffect(() => {
    pageCardsRef.current = cards;
    hiddenScanIdsRef.current = hiddenScanIds;
  }, [cards, hiddenScanIds]);
  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
      revealPacerRef.current?.dispose();
    };
  }, []);

  const currentCards = () =>
    withoutDuplicateCards([
      ...pageCardsRef.current,
      ...loadedCardsRef.current,
    ]).filter((card) => !hiddenScanIdsRef.current.has(card.scanId));

  const visibleCards = allCards.filter((card) => !hiddenScanIds.has(card.scanId));
  const unsentCount = visibleCards.filter(
    (card) => !sentScanIdsRef.current.has(card.scanId),
  ).length;
  const checkedStillVisibleCount = visibleCards.length - unsentCount;
  const estimatedUncheckedCount = Math.max(
    unsentCount,
    loadReviewCardPage ? remainingTotal - checkedStillVisibleCount : 0,
  );
  const currentStatus: ReviewAutoCheckStatus =
    status === "paused" && estimatedUncheckedCount === 0 ? "idle" : status;

  const loadMoreCards = loadReviewCardPage
    ? async () => {
        const seenScanIds = new Set([
          ...currentCards().map((card) => card.scanId),
          ...hiddenScanIdsRef.current,
          ...sentScanIdsRef.current,
        ]);
        const unseen = await loadUnseenReviewCards(
          loadReviewCardPage,
          seenScanIds,
        );
        if (unseen.length === 0) return 0;
        loadedCardsRef.current = [...loadedCardsRef.current, ...unseen];
        if (!isUnmountedRef.current) setLoadedCards(loadedCardsRef.current);
        return unseen.length;
      }
    : undefined;

  const bumpTotal = () =>
    setProgress((previous) => {
      if (!previous) return previous;
      const unsent = currentCards().filter(
        (card) => !sentScanIdsRef.current.has(card.scanId),
      ).length;
      return {
        ...previous,
        total: Math.max(previous.total, previous.checked + unsent),
      };
    });

  const run = async () => {
    if (currentStatus === "running" || currentStatus === "pausing") return;
    if (estimatedUncheckedCount === 0) return;
    const isResuming = currentStatus === "paused";
    if (!isResuming) jobOutcomesRef.current = [];
    isPauseRequestedRef.current = false;
    setStatus("running");
    setProgress((previous) => {
      const checked = isResuming && previous ? previous.checked : 0;
      return { checked, total: checked + estimatedUncheckedCount };
    });
    const touchedCollectionGuids = new Set<string>();
    const revealPacer = new ReviewAutoCheckRevealPacer({
      onReveal: (outcome) => {
        jobOutcomesRef.current.push(outcome);
        setOutcomes((previous) => new Map(previous).set(outcome.scanId, outcome));
        setProgress((previous) =>
          previous ? { ...previous, checked: previous.checked + 1 } : previous,
        );
        if (outcome.verdict === "confirmed") onConfirmed([outcome.scanId]);
      },
      onCheckingScanIdChange: (scanId) =>
        setCheckingScanIds(new Set(scanId ? [scanId] : [])),
    });
    revealPacerRef.current = revealPacer;
    let result: Awaited<ReturnType<typeof runReviewAutoCheck>> | "failed";
    try {
      result = await runReviewAutoCheck({
        cards: currentCards,
        sentScanIds: sentScanIdsRef.current,
        loadMoreCards,
        checkCollectionCards: async (collectionGuid, scanIds) => {
          touchedCollectionGuids.add(collectionGuid);
          return autoCheckCollectionReviewCards(collectionGuid, scanIds);
        },
        onBatchStart: (scanIds) => {
          revealPacer.addBatch(scanIds);
          bumpTotal();
        },
        onOutcomes: (batch) => revealPacer.addOutcomes(batch),
        isCancelled: () =>
          isUnmountedRef.current || isPauseRequestedRef.current,
      });
    } catch (err) {
      console.error("Failed to auto-check review cards:", err);
      result = "failed";
    }
    if (isUnmountedRef.current) revealPacer.dispose();
    else if (result === "finished") await revealPacer.drain();
    else revealPacer.flush();
    refreshReviewedCards([...touchedCollectionGuids]);
    if (isUnmountedRef.current) return;
    setCheckingScanIds(new Set());
    if (result === "failed") {
      setStatus("paused");
      toast.error(t("reviewGrid.autoCheckFailed"));
      return;
    }
    if (result === "cancelled") {
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
    cards: allCards,
    status: currentStatus,
    progress: currentStatus === "idle" ? null : progress,
    outcomes,
    checkingScanIds,
    canRun: estimatedUncheckedCount > 0,
    run,
    pause,
  };
}
