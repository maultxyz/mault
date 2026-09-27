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

  const setAutoFeed = useCallback((enabled: boolean) => {
    autoFeedRef.current = enabled;
    setAutoFeedState(enabled);
  }, []);

  const disableAutoFeed = useCallback(() => {
    autoFeedRef.current = false;
    setAutoFeedState(false);
  }, []);

  const isAutoFeedEnabled = useCallback(() => autoFeedRef.current, []);

  const pause = useCallback(() => {
    pauseHookRef.current?.();
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
        disableAutoFeed();
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
        disableAutoFeed();
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
    [t, activeCollectionRef, disableAutoFeed, pause],
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
      disableAutoFeed();
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
      disableAutoFeed();
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
      disableAutoFeed();
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
  }, [t, serialRef, activeCollectionRef, disableAutoFeed, handleFeedResult]);

  return {
    autoFeed,
    isAutoFeedEnabled,
    setAutoFeed,
    disableAutoFeed,
    pause,
    triggerAutoFeed,
    registerCardArrivedHook,
    registerPauseHook,
  };
}
