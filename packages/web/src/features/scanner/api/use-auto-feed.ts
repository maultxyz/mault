import { reportSerialEvent } from "@/features/notifications/api/notification-settings";
import { useSerialMessage } from "@/features/scanner/api/use-serial";
import { isFedEvent } from "@/features/scanner/lib/serial-messages";
import type { Collection } from "@magic-vault/shared";
import { useCallback, useRef, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/lib/toast";

interface AutoFeedSerial {
  sendCommand: (data: string) => Promise<boolean>;
  receiveResponse: (timeoutMs?: number) => Promise<string>;
}

export function useAutoFeed({
  serialRef,
  activeCollectionRef,
}: {
  serialRef: RefObject<AutoFeedSerial>;
  activeCollectionRef: RefObject<Collection | null | undefined>;
}) {
  const { t } = useTranslation("scanner");
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
      if (parsed.empty) {
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
        });
      } else {
        cardArrivedHookRef.current?.();
      }
    },
    [t, activeCollectionRef, pause],
  );

  useSerialMessage((message) => {
    if (!isFedEvent(message) || !autoFeedRef.current) return;
    handleFeedResult(message);
  });

  const triggerAutoFeed = useCallback(async () => {
    const sent = await serialRef.current.sendCommand(
      JSON.stringify({ feeder: true }),
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
      });
      return;
    }
    const response = await serialRef.current.receiveResponse(10000);
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
      });
    }
  }, [t, serialRef, activeCollectionRef, pause, handleFeedResult]);

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
