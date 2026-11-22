import { retryUnmatchedCardsBatch } from "@/features/collections/api/collections";
import {
  invalidateCollectionCards,
  invalidateUnmatchedCards,
} from "@/features/collections/lib/card-page-cache";
import type { RetryUnmatchedCardsState } from "@/lib/interfaces/scanner";
import { toast } from "@/lib/toast";
import {
  runUnmatchedRetry,
  type UnmatchedRetryProgress,
  type UnmatchedRetrySummary,
} from "@magic-vault/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export function useRetryUnmatchedCards(
  collectionGuid: string,
): RetryUnmatchedCardsState {
  const { t } = useTranslation("scanner");
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<UnmatchedRetryProgress | null>(null);
  const isStopRequested = useRef(false);
  const isRunning = useRef(false);

  const announceSummary = (summary: UnmatchedRetrySummary) => {
    const values = {
      count: summary.matchedCount,
      checked: summary.checkedCount,
    };
    if (summary.scanLimitReached) {
      toast.warning(t("unmatchedCardsPanel.retry.scanLimitReached", values));
    } else if (summary.wasStopped) {
      toast.info(t("unmatchedCardsPanel.retry.stopped", values));
    } else if (summary.matchedCount > 0) {
      toast.success(t("unmatchedCardsPanel.retry.matched", values));
    } else {
      toast.info(t("unmatchedCardsPanel.retry.noMatches", values));
    }
  };

  const start = async (scanIds: string[]) => {
    if (isRunning.current || scanIds.length === 0) return;
    isRunning.current = true;
    isStopRequested.current = false;
    setProgress({ checkedCount: 0, matchedCount: 0, totalCount: scanIds.length });
    try {
      announceSummary(
        await runUnmatchedRetry({
          scanIds,
          retryBatch: (batchScanIds) =>
            retryUnmatchedCardsBatch(collectionGuid, batchScanIds),
          onProgress: setProgress,
          shouldStop: () => isStopRequested.current,
        }),
      );
    } catch {
      toast.error(t("unmatchedCardsPanel.retry.failed"));
    } finally {
      isRunning.current = false;
      setProgress(null);
      invalidateCollectionCards(queryClient, collectionGuid);
      await invalidateUnmatchedCards(queryClient, collectionGuid);
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
