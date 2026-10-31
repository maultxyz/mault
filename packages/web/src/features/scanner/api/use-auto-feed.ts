import {
  reportSerialEvent,
} from "@/features/notifications/api/notification-settings";
import { useSerialMessage } from "@/features/scanner/api/use-serial";
import {
  feedWithRetries,
  isFedEvent,
  isFeedTimeoutReply,
  parseSerialReply,
} from "@magic-vault/shared";
import type { Collection } from "@magic-vault/shared";
import { useCallback, useRef, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { useStationToast } from "@/features/scanner/api/use-station-toast";
import type { AutoFeedSerial } from "@/lib/interfaces/scanner";

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
  const pauseHookRef = useRef<(() => void) | null>(null);
  const resumeHookRef = useRef<(() => void) | null>(null);

  const setAutoFeed = useCallback((enabled: boolean) => {
    autoFeedRef.current = enabled;
    setAutoFeedState(enabled);
  }, []);

  const haltedRef = useRef(false);

  const isAutoFeedEnabled = useCallback(
    () => autoFeedRef.current && !haltedRef.current,
    [],
  );
  const isFeedHalted = useCallback(() => haltedRef.current, []);
  const clearFeedHalt = useCallback(() => {
    haltedRef.current = false;
  }, []);

  const pause = useCallback(() => {
    haltedRef.current = true;
    pauseHookRef.current?.();
  }, []);

  const resume = useCallback(() => {
    haltedRef.current = false;
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

  const registerPauseHook = useCallback((fn: () => void) => {
    pauseHookRef.current = fn;
    return () => {
      if (pauseHookRef.current === fn) pauseHookRef.current = null;
    };
  }, []);

  const handleFeedResult = useCallback(
    (parsed: Record<string, unknown>) => {
      if (parsed.empty && !serialRef.current.ignoreIrSensors) {
        pause();
        toast.error(t("feederEmpty.title"), {
          description: t("feederEmpty.description"),
          duration: Infinity,
          dismissible: true,
        });
        void reportSerialEvent({
          command: "auto-feed",
          sent: true,
          response: parsed,
          collectionGuid: activeCollectionRef.current?.guid,
          deviceGuid: deviceGuidRef.current,
        });
      } else if (parsed.error) {
        pause();
        toast.error(t("feederError.title"), {
          description: String(parsed.error),
          duration: Infinity,
          dismissible: true,
        });
        void reportSerialEvent({
          command: "auto-feed",
          sent: true,
          response: parsed,
          collectionGuid: activeCollectionRef.current?.guid,
          deviceGuid: deviceGuidRef.current,
        });
      } else if (
        parsed.detected === false &&
        !serialRef.current.ignoreIrSensors
      ) {
        pause();
        toast.error(t("cardScanner.noCardDetected.title"), {
          description: t("cardScanner.noCardDetected.description"),
        });
        void reportSerialEvent({
          command: "auto-feed",
          sent: true,
          response: parsed,
          collectionGuid: activeCollectionRef.current?.guid,
          deviceGuid: deviceGuidRef.current,
        });
      } else {
        cardArrivedHookRef.current?.();
      }
    },
    [toast, t, serialRef, activeCollectionRef, deviceGuidRef, pause],
  );

  const feedRetryCount = useCallback(
    () => (serialRef.current.ignoreIrSensors ? 0 : feedRetryCountRef.current),
    [serialRef, feedRetryCountRef],
  );

  const sendAutoFeed = useCallback(async (retryCount: number) => {
    const { sent, line: response } = await feedWithRetries(
      () => serialRef.current.sendRequest({ feeder: true }, 10000),
      (result) => (result.sent ? parseSerialReply(result.line) : null),
      retryCount,
    );
    if (!sent) {
      pause();
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
      pause();
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
      pause();
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
    serialRef,
    activeCollectionRef,
    deviceGuidRef,
    pause,
    handleFeedResult,
  ]);

  const triggerAutoFeed = useCallback(
    () => sendAutoFeed(feedRetryCount()),
    [sendAutoFeed, feedRetryCount],
  );

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
    triggerAutoFeed,
    registerCardArrivedHook,
    registerPauseHook,
    resume,
    registerResumeHook,
  };
}
