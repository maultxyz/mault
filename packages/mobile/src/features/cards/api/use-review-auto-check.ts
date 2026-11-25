import {
  countReviewAutoCheckVerdicts,
  runReviewAutoCheck,
  type ReviewAutoCheckOutcome,
  type ReviewGridCard,
} from "@magic-vault/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/toast-provider";
import { autoCheckCollectionReviewCards } from "@/features/cards/api/review-grid";
import { invalidateCollectionCards } from "@/features/collections/api/collection-cards";
import { billingQueryOptions } from "@/features/org/api/billing";
import { useActiveOrgId } from "@/hooks/use-org";
import type { ReviewAutoCheckProgress } from "@/lib/interfaces/cards";

export function useReviewAutoCheck(cards: ReviewGridCard[], onConfirmed: (scanIds: string[]) => void, onFinished: () => void) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const activeOrgId = useActiveOrgId();
  const billing = useQuery(billingQueryOptions(activeOrgId));
  const [outcomes, setOutcomes] = useState<ReadonlyMap<string, ReviewAutoCheckOutcome>>(new Map());
  const [progress, setProgress] = useState<ReviewAutoCheckProgress | null>(null);
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
          const result = await autoCheckCollectionReviewCards(collectionGuid, scanIds);
          setProgress((previous) => (previous ? { ...previous, checked: previous.checked + scanIds.length } : previous));
          return result;
        },
        onOutcomes: (batch) => {
          runOutcomes.push(...batch);
          setOutcomes((previous) => {
            const next = new Map(previous);
            for (const outcome of batch) next.set(outcome.scanId, outcome);
            return next;
          });
          onConfirmed(batch.filter((outcome) => outcome.verdict === "confirmed").map((outcome) => outcome.scanId));
        },
        isCancelled: () => isUnmountedRef.current,
      });
      if (isUnmountedRef.current) return;
      const counts = countReviewAutoCheckVerdicts(runOutcomes);
      showToast({
        message: t("reviewGrid.autoCheckComplete", { count: counts.confirmed, needsLook: counts.different + counts.unsure }),
        tone: "success",
      });
    } catch {
      if (!isUnmountedRef.current) showToast({ message: t("reviewGrid.autoCheckFailed"), tone: "destructive" });
    } finally {
      for (const guid of new Set(cardsToCheck.map((card) => card.collectionGuid))) invalidateCollectionCards(queryClient, guid);
      onFinished();
      if (!isUnmountedRef.current) setProgress(null);
    }
  };

  return {
    isAvailable: billing.data?.reviewAutoCheck === true,
    outcomes,
    progress,
    uncheckedCount: uncheckedCards.length,
    run,
  };
}
