import {
  reportSerialEvent,
} from "@/features/notifications/api/notification-settings";
import { useSerialMessage } from "@/features/scanner/api/use-serial";
import {
  classifyFeedReply,
  feedNextCardAfterRoutedCard,
  feedWithRetries,
  isFedEvent,
  isFeedTimeoutReply,
  parseSerialReply,
  SERIAL_DEFAULT_RESPONSE_TIMEOUT_MS,
} from "@magic-vault/shared";
import type { Collection, SerialRequestResult } from "@magic-vault/shared";
import { useCallback, useRef, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { useStationToast } from "@/features/scanner/api/use-station-toast";
import { replyOfFeedRequest } from "@/features/scanner/lib/feed-request-reply";
import type { AutoFeedSerial, FeedSource } from "@/lib/interfaces/scanner";
import type {
  StationAttention,
  StationAttentionDetails,
} from "@/lib/interfaces/stations";

export function useAutoFeed({
  serialRef,
  activeCollectionRef,
  deviceGuidRef,
  feedRetryCountRef,
}: {
  serialRef: RefObject<AutoFeedSerial>;
  activeCollectionRef: RefObject<Collection | null | undefined>;
  deviceGuidRef: RefObject<string | undefined>;
  feedRetryCountRef: RefObject<number>;
}) {
  const { t } = useTranslation("scanner");
  const toast = useStationToast();
  const [autoFeed, setAutoFeedState] = useState(true);
  const autoFeedRef = useRef(true);
  const cardArrivedHookRef = useRef<(() => void) | null>(null);
  const feedSourceRef = useRef<FeedSource | null>(null);
  const pauseHookRef = useRef<(() => void) | null>(null);
  const resumeHookRef = useRef<(() => void) | null>(null);

  const setAutoFeed = useCallback((enabled: boolean) => {
    autoFeedRef.current = enabled;
    setAutoFeedState(enabled);
  }, []);

  const haltedRef = useRef(false);
  const emergencyStoppedRef = useRef(false);
  const [attention, setAttention] = useState<StationAttention | null>(null);

  const isAutoFeedEnabled = useCallback(
    () => autoFeedRef.current && !haltedRef.current,
    [],
  );
  const isFeedHalted = useCallback(() => haltedRef.current, []);
  const clearFeedHalt = useCallback(() => {
    if (emergencyStoppedRef.current) return;
    haltedRef.current = false;
    setAttention(null);
  }, []);

  const pause = useCallback(() => {
    haltedRef.current = true;
    pauseHookRef.current?.();
  }, []);

  const pauseForAttention = useCallback(
    (details: StationAttentionDetails) => {
      if (
        !emergencyStoppedRef.current ||
        details.kind === "emergencyStopped"
      ) {
        setAttention({ ...details, raisedAt: Date.now() });
      }
      pause();
    },
    [pause],
  );

  const emergencyStop = useCallback(async () => {
    emergencyStoppedRef.current = true;
    pauseForAttention({ kind: "emergencyStopped" });
    if (!serialRef.current.supportsEmergencyStop) {
      toast.warning(t("emergencyStop.unsupported.title"), {
        description: t("emergencyStop.unsupported.description"),
        duration: Infinity,
        dismissible: true,
      });
      return;
    }
    if (!(await serialRef.current.sendEmergencyStop())) {
      toast.error(t("emergencyStop.unconfirmed.title"), {
        description: t("emergencyStop.unconfirmed.description"),
        duration: Infinity,
        dismissible: true,
      });
    }
  }, [pauseForAttention, serialRef, toast, t]);

  const resetAfterEmergencyStop = useCallback(async () => {
    if (!(await serialRef.current.sendNeutral())) {
      toast.error(t("emergencyStop.resetFailed.title"), {
        description: t("emergencyStop.resetFailed.description"),
      });
      return false;
    }
    emergencyStoppedRef.current = false;
    setAttention(null);
    return true;
  }, [serialRef, toast, t]);

  const resume = useCallback(() => {
    if (emergencyStoppedRef.current) return;
    haltedRef.current = false;
    setAttention(null);
    resumeHookRef.current?.();
  }, []);

  const registerResumeHook = useCallback((fn: () => void) => {
    resumeHookRef.current = fn;
    return () => {
      if (resumeHookRef.current === fn) resumeHookRef.current = null;
    };
  }, []);

  const registerCardArrivedHook = useCallback((fn: () => void) => {
    cardArrivedHookRef.current = fn;
    return () => {
      if (cardArrivedHookRef.current === fn) cardArrivedHookRef.current = null;
    };
  }, []);

  const registerFeedSource = useCallback((feedSource: FeedSource) => {
    feedSourceRef.current = feedSource;
    return () => {
      if (feedSourceRef.current === feedSource) feedSourceRef.current = null;
    };
  }, []);

  const hasCustomFeedSource = useCallback(() => !!feedSourceRef.current, []);

  const feedOneCard = useCallback(
    () =>
      feedSourceRef.current
        ? feedSourceRef.current()
        : serialRef.current.sendRequest({ feeder: true }, 10000),
    [serialRef],
  );

  const registerPauseHook = useCallback((fn: () => void) => {
    pauseHookRef.current = fn;
    return () => {
      if (pauseHookRef.current === fn) pauseHookRef.current = null;
    };
  }, []);

  const handleFeedResult = useCallback(
    (parsed: Record<string, unknown>) => {
      if (emergencyStoppedRef.current) return;
      const outcome = classifyFeedReply(parsed, {
        ignoreIrSensors: serialRef.current.ignoreIrSensors,
      });
      if (outcome.kind === "stopped") return;
      if (outcome.kind === "cardArrived") {
        cardArrivedHookRef.current?.();
        return;
      }
      if (outcome.kind === "hopperEmpty") {
        pauseForAttention({ kind: "hopperEmpty" });
        toast.error(t("feederEmpty.title"), {
          description: t("feederEmpty.description"),
          duration: Infinity,
          dismissible: true,
        });
      } else if (outcome.kind === "error") {
        pauseForAttention({ kind: "feederError", detail: outcome.message });
        toast.error(t("feederError.title"), {
          description: outcome.message,
          duration: Infinity,
          dismissible: true,
        });
      } else if (outcome.kind === "noCardDetected") {
        pauseForAttention({ kind: "noCardDetected" });
        toast.error(t("cardScanner.noCardDetected.title"), {
          description: t("cardScanner.noCardDetected.description"),
        });
      }
      void reportSerialEvent({
        command: "auto-feed",
        sent: true,
        response: parsed,
        collectionGuid: activeCollectionRef.current?.guid,
        deviceGuid: deviceGuidRef.current,
      });
    },
    [toast, t, serialRef, activeCollectionRef, deviceGuidRef, pauseForAttention],
  );

  const feedRetryCount = useCallback(
    () => (serialRef.current.ignoreIrSensors ? 0 : feedRetryCountRef.current),
    [serialRef, feedRetryCountRef],
  );

  const handleFeedRequestResult = useCallback(({
    sent,
    line: response,
  }: SerialRequestResult) => {
    if (emergencyStoppedRef.current) return;
    if (!sent) {
      pauseForAttention({ kind: "sorterNotResponding" });
      toast.error(t("scannedCards.autoFeedFailed.title"), {
        description: t("feederCommandFailedDescription"),
      });
      void reportSerialEvent({
        command: "auto-feed",
        sent: false,
        response: null,
        collectionGuid: activeCollectionRef.current?.guid,
        deviceGuid: deviceGuidRef.current,
      });
      return;
    }
    if (!response) {
      pauseForAttention({ kind: "sorterNotResponding" });
      toast.error(t("scannedCards.autoFeedTimeout.title"), {
        description: t("feederTimeoutDescription"),
      });
      void reportSerialEvent({
        command: "auto-feed",
        sent: true,
        response: null,
        collectionGuid: activeCollectionRef.current?.guid,
        deviceGuid: deviceGuidRef.current,
      });
      return;
    }
    try {
      handleFeedResult(JSON.parse(response) as Record<string, unknown>);
    } catch {
      pauseForAttention({ kind: "sorterNotResponding" });
      toast.error(t("scannedCards.autoFeedError.title"), {
        description: t("feederUnexpectedResponseDescription"),
      });
      void reportSerialEvent({
        command: "auto-feed",
        sent: true,
        response,
        collectionGuid: activeCollectionRef.current?.guid,
        deviceGuid: deviceGuidRef.current,
      });
    }
  }, [
    toast,
    t,
    activeCollectionRef,
    deviceGuidRef,
    pauseForAttention,
    handleFeedResult,
  ]);

  const sendAutoFeed = useCallback(
    async (retryCount: number) =>
      handleFeedRequestResult(
        await feedWithRetries(feedOneCard, replyOfFeedRequest, retryCount),
      ),
    [feedOneCard, handleFeedRequestResult],
  );

  const triggerAutoFeed = useCallback(
    () => sendAutoFeed(feedRetryCount()),
    [sendAutoFeed, feedRetryCount],
  );

  const readSensors = useCallback(async () => {
    const { sent, line } = await serialRef.current.sendRequest(
      { readIR: true },
      SERIAL_DEFAULT_RESPONSE_TIMEOUT_MS,
    );
    return sent ? parseSerialReply(line) : null;
  }, [serialRef]);

  const triggerAutoFeedAfterRoutedCard = useCallback(async () => {
    if (feedSourceRef.current || serialRef.current.ignoreIrSensors) {
      await triggerAutoFeed();
      return;
    }
    const outcome = await feedNextCardAfterRoutedCard({
      readSensors,
      feedOnce: feedOneCard,
      replyOf: replyOfFeedRequest,
      retryCount: feedRetryCount(),
    });
    if (outcome.kind === "fed") {
      handleFeedRequestResult(outcome.result);
      return;
    }
    pauseForAttention({ kind: "cardStuckInModuleOne" });
    toast.error(t("cardScanner.cardStuckInModuleOne.title"), {
      description: t("cardScanner.cardStuckInModuleOne.description"),
      duration: Infinity,
      dismissible: true,
    });
  }, [
    serialRef,
    readSensors,
    triggerAutoFeed,
    feedOneCard,
    feedRetryCount,
    handleFeedRequestResult,
    pauseForAttention,
    toast,
    t,
  ]);

  useSerialMessage((message) => {
    if (!isFedEvent(message) || !autoFeedRef.current) return;
    const retryCount = feedRetryCount();
    if (retryCount > 0 && isFeedTimeoutReply(message)) {
      void sendAutoFeed(retryCount - 1);
      return;
    }
    handleFeedResult(message);
  });

  return {
    autoFeed,
    isAutoFeedEnabled,
    setAutoFeed,
    isFeedHalted,
    clearFeedHalt,
    pause,
    pauseForAttention,
    emergencyStop,
    resetAfterEmergencyStop,
    attention,
    triggerAutoFeed,
    triggerAutoFeedAfterRoutedCard,
    registerCardArrivedHook,
    registerFeedSource,
    hasCustomFeedSource,
    feedOneCard,
    registerPauseHook,
    resume,
    registerResumeHook,
  };
}
