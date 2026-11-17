import { useCallback, useEffect, useRef, useState } from "react";
import {
  feederTestBottomBinRoute,
  runFeederTest,
  type FeederTestFormValues,
  type FeederTestResult,
} from "@magic-vault/shared";
import { useSorter } from "@/features/sorter/api/use-sorter";
import type { FeederTestControls, UseFeederTestOptions } from "@/lib/interfaces/calibration";

export function useFeederTest({ moduleCount, feedRetryCount }: UseFeederTestOptions): FeederTestControls {
  const sorter = useSorter();
  const [isRunning, setIsRunning] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [cardsSent, setCardsSent] = useState(0);
  const [cardsToSend, setCardsToSend] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<FeederTestResult | null>(null);
  const isRunningRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const latest = useRef({ sorter, moduleCount, feedRetryCount });
  latest.current = { sorter, moduleCount, feedRetryCount };

  useEffect(
    () => () => {
      stopRequestedRef.current = true;
    },
    [],
  );

  const start = useCallback(
    async ({ runUntilStopped, cardsToSend: count }: FeederTestFormValues) => {
      if (!latest.current.sorter.isReady || isRunningRef.current) return;
      const target = runUntilStopped ? null : count;
      isRunningRef.current = true;
      stopRequestedRef.current = false;
      setCardsToSend(target);
      setCardsSent(0);
      setLastResult(null);
      setIsStopping(false);
      setIsRunning(true);
      try {
        if (!(await latest.current.sorter.sendNeutral())) {
          setLastResult({ outcome: "feedFailed", cardsSent: 0, error: null });
          return;
        }
        setLastResult(
          await runFeederTest({
            cardsToSend: target,
            currentFeedRetryCount: () => latest.current.feedRetryCount,
            feedOnce: () => latest.current.sorter.feed(),
            routeCardToBottomBin: () =>
              latest.current.sorter.sendRoute(feederTestBottomBinRoute(latest.current.moduleCount)),
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
    [],
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
    lastResult,
    canStart: sorter.isReady && !isRunning,
    start,
    stop,
  };
}
