import { useCollections } from "@/features/collections/api/use-collections";
import {
  feedPiScanSession,
  pausePiScanSession,
  piScanHoldsPort,
  resumePiScanSession,
  startPiScanSession,
  stopPiScanSession,
  updatePiScanSettings,
} from "@/features/scanner/api/pi-scan-session";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useSerial } from "@/features/scanner/api/use-serial";
import { useStation } from "@/features/scanner/api/use-stations";
import { readPiCameraHealth } from "@/features/scanner/lib/pi-camera";
import {
  applyPiScanState,
  getPiScanState,
  notePiScanMessage,
  setPiScanHoldOverride,
  subscribePiScan,
} from "@/features/scanner/lib/pi-scan-store";
import { toast } from "@/lib/toast";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function usePiScanSession() {
  const { t } = useTranslation("scanner");
  const { activeCollection } = useCollections();
  const { autoFeed, forceFoilType, forceSetCodes } = useScannedCards();
  const { disconnect } = useSerial();
  const { isActive } = useStation();
  const state = useSyncExternalStore(subscribePiScan, getPiScanState);
  const [cameraReady, setCameraReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const collectionGuid = activeCollection?.guid;
  const sessionLive = piScanHoldsPort(state);

  useEffect(() => {
    let cancelled = false;
    void readPiCameraHealth().then((health) => {
      if (!cancelled) setCameraReady(health.status === "ready");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sessionLive || !isActive) return;
    void updatePiScanSettings({
      foilType: forceFoilType,
      preferredSetCodes: forceSetCodes,
    }).catch(() => {});
  }, [sessionLive, isActive, forceFoilType, forceSetCodes]);

  const start = useCallback(async () => {
    if (!collectionGuid) {
      toast.error(t("scannedCards.noCollectionSelected.title"), {
        description: t("scannedCards.noCollectionSelected.description"),
      });
      return;
    }
    setStarting(true);
    setPiScanHoldOverride(true);
    try {
      await disconnect();
      let result = await startPiScanSession({
        collectionGuid,
        foilType: forceFoilType,
        preferredSetCodes: forceSetCodes,
        autoFeed,
      });
      if (!result.success && result.code === "busy") {
        await sleep(400);
        result = await startPiScanSession({
          collectionGuid,
          foilType: forceFoilType,
          preferredSetCodes: forceSetCodes,
          autoFeed,
        });
      }
      if (result.data) applyPiScanState(result.data);
      if (!result.success) {
        notePiScanMessage(result.message ?? null);
        toast.error(result.message ?? t("serial.connectionFailed.title"));
      }
    } finally {
      setPiScanHoldOverride(false);
      setStarting(false);
    }
  }, [
    autoFeed,
    collectionGuid,
    disconnect,
    forceFoilType,
    forceSetCodes,
    t,
  ]);

  const pause = useCallback(async () => {
    const result = await pausePiScanSession();
    if (result.data) applyPiScanState(result.data);
  }, []);

  const resume = useCallback(async () => {
    const result = await resumePiScanSession();
    if (result.data) applyPiScanState(result.data);
  }, []);

  const stop = useCallback(async () => {
    const result = await stopPiScanSession();
    if (result.data) applyPiScanState(result.data);
  }, []);

  const setAutoFeed = useCallback(
    (enabled: boolean) => {
      if (!piScanHoldsPort(state)) return;
      void updatePiScanSettings({ autoFeed: enabled }).then((result) => {
        if (result.data) applyPiScanState(result.data);
      });
    },
    [state],
  );

  const feed = useCallback(() => {
    if (!piScanHoldsPort(state)) return;
    void feedPiScanSession().then((result) => {
      if (result.data) applyPiScanState(result.data);
    });
  }, [state]);

  const startOrResume = useCallback(() => {
    if (state.phase === "running") return;
    if (state.phase === "paused") {
      void resume();
      return;
    }
    void start();
  }, [resume, start, state.phase]);

  return {
    cameraReady,
    starting,
    state,
    startOrResume,
    pause,
    stop,
    feed,
    setAutoFeed,
  };
}
