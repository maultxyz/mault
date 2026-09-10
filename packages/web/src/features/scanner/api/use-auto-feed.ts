import { reportSerialEvent } from "@/features/notifications/api/notification-settings";
import type { Collection } from "@magic-vault/shared";
import { useCallback, useRef, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

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

  const triggerAutoFeed = useCallback(async () => {
    const sent = await serialRef.current.sendCommand(
      JSON.stringify({ feeder: true }),
    );
    if (!sent) {
      disableAutoFeed();
      toast.error(t("scannedCards.autoFeedFailed.title"), {
        description: t("scannedCards.autoFeedFailed.description"),
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
        description: t("scannedCards.autoFeedTimeout.description"),
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
      const parsed = JSON.parse(response) as Record<string, unknown>;
      if (parsed.empty) {
        disableAutoFeed();
        pause();
        toast.error(t("scannedCards.feederEmpty.title"), {
          description: t("scannedCards.feederEmpty.description"),
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
        toast.error(t("scannedCards.feederError.title"), {
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
    } catch {
      disableAutoFeed();
      toast.error(t("scannedCards.autoFeedError.title"), {
        description: t("scannedCards.autoFeedError.description"),
      });
      void reportSerialEvent({
        command: "auto-feed",
        sent: true,
        response,
        collectionGuid: activeCollectionRef.current?.guid,
      });
    }
  }, [t, serialRef, activeCollectionRef, disableAutoFeed, pause]);

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
