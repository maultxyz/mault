import { useResetToNeutral } from "@/features/scanner/api/use-reset-to-neutral";
import { useSerial } from "@/features/scanner/api/use-serial";
import { useStationToast } from "@/features/scanner/api/use-station-toast";
import type {
  FeederTestControls,
  UseFeederTestOptions,
} from "@/lib/interfaces/calibration";
import {
  FEEDER_TEST_RESPONSE_TIMEOUT_MS,
  feederTestBottomBinRoute,
  parseSerialReply,
  runFeederTest,
  type FeederTestFormValues,
  type FeederTestResult,
} from "@magic-vault/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export function useFeederTest({
  moduleCount,
  feedRetryCount,
  applyDraftsToDevice,
}: UseFeederTestOptions): FeederTestControls {
  const { t } = useTranslation("calibration");
  const toast = useStationToast();
  const { isReady, sendRequest, sendRoute } = useSerial();
  const { resetToNeutral } = useResetToNeutral();
  const [isRunning, setIsRunning] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [cardsSent, setCardsSent] = useState(0);
  const [cardsToSend, setCardsToSend] = useState<number | null>(null);
  const isRunningRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const feedRetryCountRef = useRef(feedRetryCount);
  feedRetryCountRef.current = feedRetryCount;

  useEffect(
    () => () => {
      stopRequestedRef.current = true;
    },
    [],
  );

  const showResult = useCallback(
    ({ outcome, cardsSent: count, error }: FeederTestResult) => {
      if (outcome === "completed") {
        toast.success(t("feederTest.toasts.completed", { count }));
      } else if (outcome === "stopped") {
        toast.info(t("feederTest.toasts.stopped", { count }));
      } else if (outcome === "hopperEmpty") {
        toast.info(t("feederTest.toasts.hopperEmpty", { count }));
      } else {
        toast.error(t("feederTest.toasts.failed", { count }), {
          description: error ?? t("toasts.noResponse"),
        });
      }
    },
    [toast, t],
  );

  const start = useCallback(
    async ({ runUntilStopped, cardsToSend: count }: FeederTestFormValues) => {
      if (!isReady || isRunningRef.current) return;
      const target = runUntilStopped ? null : count;
      isRunningRef.current = true;
      stopRequestedRef.current = false;
      setCardsToSend(target);
      setCardsSent(0);
      setIsStopping(false);
      setIsRunning(true);
      try {
        await applyDraftsToDevice();
        if (!(await resetToNeutral())) return;
        showResult(
          await runFeederTest({
            cardsToSend: target,
            currentFeedRetryCount: () => feedRetryCountRef.current,
            prepareNextCard: applyDraftsToDevice,
            feedOnce: async () => {
              const { sent, line } = await sendRequest(
                { feeder: true },
                FEEDER_TEST_RESPONSE_TIMEOUT_MS,
              );
              return sent ? parseSerialReply(line) : null;
            },
            routeCardToBottomBin: () =>
              sendRoute(feederTestBottomBinRoute(moduleCount)),
            isStopRequested: () => stopRequestedRef.current,
            onCardSent: setCardsSent,
          }),
        );
      } finally {
        isRunningRef.current = false;
        setIsRunning(false);
        setIsStopping(false);
      }
    },
    [
      isReady,
      applyDraftsToDevice,
      resetToNeutral,
      sendRequest,
      sendRoute,
      moduleCount,
      showResult,
    ],
  );

  const stop = useCallback(() => {
    if (!isRunningRef.current) return;
    stopRequestedRef.current = true;
    setIsStopping(true);
  }, []);

  return {
    isRunning,
    isStopping,
    cardsSent,
    cardsToSend,
    canStart: isReady && !isRunning,
    start,
    stop,
  };
}
