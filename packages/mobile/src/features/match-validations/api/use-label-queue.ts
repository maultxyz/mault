import { useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { LABEL_QUEUE_PREFETCH_COUNT, LABEL_QUEUE_REFILL_THRESHOLD } from "@/lib/constants/match-validations";
import type { LabelQueueHistoryEntry, LabelQueueOptions } from "@/lib/interfaces/match-validations";
import { absoluteUrl } from "@/lib/url";
import type { MatchValidationQueueItem } from "@magic-vault/shared";

export function useLabelQueue<Decision extends string>({
  items,
  isFetchingQueue,
  queueFetchedAt,
  refetchQueue,
  saveLabel,
  saveErrorMessage,
}: LabelQueueOptions<Decision>) {
  const [history, setHistory] = useState<LabelQueueHistoryEntry<Decision>[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [pendingSaveCount, setPendingSaveCount] = useState(0);
  const [lastLabelSavedAt, setLastLabelSavedAt] = useState(0);

  const forgetFailedLabel = (scanId: string, message?: string) => {
    setHistory((entries) => entries.filter((entry) => entry.item.scanId !== scanId));
    setCursor(null);
    Alert.alert(message || saveErrorMessage);
  };

  const saveMutation = useMutation({
    mutationFn: ({ item, decision }: { item: MatchValidationQueueItem; decision: Decision }) => saveLabel(item, decision),
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

  const decidedScanIds = useMemo(() => new Set(history.map((entry) => entry.item.scanId)), [history]);
  const upcoming = useMemo(
    () => (items ?? []).filter((item) => !decidedScanIds.has(item.scanId)),
    [items, decidedScanIds],
  );
  const revisiting = cursor === null ? null : history[cursor];
  const current = revisiting?.item ?? upcoming[0] ?? null;

  const needsRefill = upcoming.length < LABEL_QUEUE_REFILL_THRESHOLD && lastLabelSavedAt > queueFetchedAt;
  useEffect(() => {
    if (needsRefill && !isFetchingQueue) void refetchQueue();
  }, [needsRefill, isFetchingQueue, refetchQueue]);
  const isLoadingMore = !current && (needsRefill || pendingSaveCount > 0 || isFetchingQueue);

  useEffect(() => {
    const urls = upcoming
      .slice(1, 1 + LABEL_QUEUE_PREFETCH_COUNT)
      .flatMap((item) => [absoluteUrl(item.capturedImageUrl), absoluteUrl(item.catalogImageUrl)])
      .filter((url): url is string => !!url && !url.startsWith("data:"));
    if (urls.length > 0) void Image.prefetch(urls);
  }, [upcoming]);

  const nextCursor = cursor !== null && cursor + 1 < history.length ? cursor + 1 : null;

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

  return { current, revisiting, history, decide, skip, goBack, canGoBack, isLoadingMore };
}
