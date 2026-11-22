import {
  runUnmatchedRetry,
  type UnmatchedRetryProgress,
  type UnmatchedRetrySummary,
} from "@magic-vault/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/toast-provider";
import {
  invalidateUnmatchedCards,
  retryUnmatchedCardsBatch,
} from "@/features/collections/api/unmatched-cards";
import type { RetryUnmatchedCardsState } from "@/lib/interfaces/scanner";

export function useRetryUnmatchedCards(collectionGuid: string): RetryUnmatchedCardsState {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [progress, setProgress] = useState<UnmatchedRetryProgress | null>(null);
  const isStopRequested = useRef(false);
  const isRunning = useRef(false);

  const summaryMessage = (summary: UnmatchedRetrySummary) => {
    const values = { count: summary.matchedCount, checked: summary.checkedCount };
    if (summary.scanLimitReached) return t("unmatchedCards.retry.scanLimitReached", values);
    if (summary.wasStopped) return t("unmatchedCards.retry.stopped", values);
    if (summary.matchedCount > 0) return t("unmatchedCards.retry.matched", values);
    return t("unmatchedCards.retry.noMatches", values);
  };

  const start = async (scanIds: string[]) => {
    if (isRunning.current || scanIds.length === 0) return;
    isRunning.current = true;
    isStopRequested.current = false;
    setProgress({ checkedCount: 0, matchedCount: 0, totalCount: scanIds.length });
    try {
      const summary = await runUnmatchedRetry({
        scanIds,
        retryBatch: (batchScanIds) => retryUnmatchedCardsBatch(collectionGuid, batchScanIds),
        onProgress: setProgress,
        shouldStop: () => isStopRequested.current,
      });
      showToast({
        message: summaryMessage(summary),
        tone: summary.matchedCount > 0 && !summary.scanLimitReached ? "success" : "default",
      });
    } catch {
      showToast({ message: t("unmatchedCards.retry.failed"), tone: "destructive" });
    } finally {
      isRunning.current = false;
      setProgress(null);
      invalidateUnmatchedCards(queryClient, collectionGuid);
    }
  };

  return {
    progress,
    isRetrying: progress != null,
    start,
    stop: () => {
      isStopRequested.current = true;
    },
  };
}
