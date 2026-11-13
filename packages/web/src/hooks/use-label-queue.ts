import {
  LABEL_QUEUE_PREFETCH_COUNT,
  LABEL_QUEUE_REFILL_THRESHOLD,
} from "@/lib/constants/label-queue";
import type {
  LabelQueueHistoryEntry,
  LabelQueueItem,
  LabelQueueOptions,
} from "@/lib/interfaces/label-queue";
import { toast } from "@/lib/toast";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

export function useLabelQueue<
  Item extends LabelQueueItem,
  Decision extends string,
>({
  items,
  isFetchingQueue,
  queueFetchedAt,
  refetchQueue,
  saveLabel,
  saveErrorMessage,
}: LabelQueueOptions<Item, Decision>) {
  const [history, setHistory] = useState<
    LabelQueueHistoryEntry<Item, Decision>[]
  >([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [pendingSaveCount, setPendingSaveCount] = useState(0);
  const [lastLabelSavedAt, setLastLabelSavedAt] = useState(0);

  const forgetFailedLabel = (scanId: string, message?: string) => {
    setHistory((entries) =>
      entries.filter((entry) => entry.item.scanId !== scanId),
    );
    setCursor(null);
    toast.error(message || saveErrorMessage);
  };

  const saveMutation = useMutation({
    mutationFn: ({ item, decision }: { item: Item; decision: Decision }) =>
      saveLabel(item, decision),
    onMutate: () => setPendingSaveCount((count) => count + 1),
    onSettled: () => setPendingSaveCount((count) => count - 1),
    onSuccess: (result, request) => {
      if (!result.success) {
        forgetFailedLabel(request.item.scanId, result.message);
        return;
      }
      setLastLabelSavedAt(Date.now());
    },
    onError: (_error, request) => forgetFailedLabel(request.item.scanId),
  });

  const decidedScanIds = useMemo(
    () => new Set(history.map((entry) => entry.item.scanId)),
    [history],
  );
  const upcoming = useMemo(
    () => (items ?? []).filter((item) => !decidedScanIds.has(item.scanId)),
    [items, decidedScanIds],
  );
  const revisiting = cursor === null ? null : history[cursor];
  const current = revisiting?.item ?? upcoming[0] ?? null;

  const needsRefill =
    upcoming.length < LABEL_QUEUE_REFILL_THRESHOLD &&
    lastLabelSavedAt > queueFetchedAt;
  useEffect(() => {
    if (needsRefill && !isFetchingQueue) void refetchQueue();
  }, [needsRefill, isFetchingQueue, refetchQueue]);
  const isLoadingMore =
    !current && (needsRefill || pendingSaveCount > 0 || isFetchingQueue);

  useEffect(() => {
    for (const item of upcoming.slice(1, 1 + LABEL_QUEUE_PREFETCH_COUNT)) {
      if (item.capturedImageUrl) new Image().src = item.capturedImageUrl;
    }
  }, [upcoming]);

  const nextCursor =
    cursor !== null && cursor + 1 < history.length ? cursor + 1 : null;

  const decide = (decision: Decision) => {
    if (!current) return;
    const index = cursor ?? history.length;
    setHistory((entries) => {
      const next = [...entries];
      next[index] = { item: current, decision };
      return next;
    });
    setCursor(nextCursor);
    saveMutation.mutate({ item: current, decision });
  };

  const skip = () => {
    if (!current) return;
    if (revisiting) {
      setCursor(nextCursor);
      return;
    }
    setHistory((entries) => [...entries, { item: current, decision: "skipped" }]);
    setCursor(null);
  };

  const canGoBack = (cursor ?? history.length) > 0;
  const goBack = () => {
    const index = (cursor ?? history.length) - 1;
    if (index >= 0) setCursor(index);
  };

  return {
    current,
    revisiting,
    history,
    decide,
    skip,
    goBack,
    canGoBack,
    isLoadingMore,
  };
}
