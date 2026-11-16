import { delay } from "@/lib/delay";
import { useScanRemoval } from "@/features/scanner/api/use-scan-removal";
import { useCollections } from "@/features/collections/api/use-collections";
import {
  emergencyStopPiScanSession,
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
import { usePiHostState } from "@/hooks/use-pi-host";
import { readPiCameraHealth } from "@/features/scanner/lib/pi-camera";
import {
  applyPiScanState,
  getPiScanState,
  notePiScanMessage,
  setPiScanHoldOverride,
  subscribePiScan,
} from "@/features/scanner/lib/pi-scan-store";
import { settlePiScanSessionRequest } from "@/features/scanner/lib/pi-scan-session-result";
import { toast } from "@/lib/toast";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { PI_CAMERA_HEALTH_RETRY_MS } from "@/lib/constants/scanner";

export function usePiScanSession(getAllowDuplicates?: () => boolean) {
  const { t } = useTranslation("scanner");
  const { activeCollection } = useCollections();
  const { autoFeed, forceFoilType, forceSetCodes, scanCondition } =
    useScannedCards();
  const { disconnect } = useSerial();
  const { piHost, piSorter } = usePiHostState();
  const state = useSyncExternalStore(subscribePiScan, getPiScanState);
  const { isRemoveModeEnabled, removalBinNumber } = useScanRemoval();
  const [cameraReady, setCameraReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const collectionGuid = activeCollection?.guid;

  useEffect(() => {
    if (!piHost) return;
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    async function checkCamera() {
      const health = await readPiCameraHealth();
      if (cancelled) return;
      if (health.status === "ready") setCameraReady(true);
      else
        retry = setTimeout(() => void checkCamera(), PI_CAMERA_HEALTH_RETRY_MS);
    }
    void checkCamera();
    return () => {
      cancelled = true;
      clearTimeout(retry);
    };
  }, [piHost]);

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
      if (!piSorter) await disconnect();
      let result = await startPiScanSession({
        collectionGuid,
        condition: scanCondition,
        foilType: forceFoilType,
        preferredSetCodes: forceSetCodes,
        autoFeed,
        removalEnabled: isRemoveModeEnabled,
        removalBinNumber,
        allowDuplicates: getAllowDuplicates?.(),
      });
      if (!result.success && result.code === "busy") {
        await delay(400);
        result = await startPiScanSession({
          collectionGuid,
          condition: scanCondition,
          foilType: forceFoilType,
          preferredSetCodes: forceSetCodes,
          autoFeed,
          removalEnabled: isRemoveModeEnabled,
          removalBinNumber,
          allowDuplicates: getAllowDuplicates?.(),
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
    isRemoveModeEnabled,
    removalBinNumber,
    getAllowDuplicates,
    collectionGuid,
    disconnect,
    piSorter,
    forceFoilType,
    forceSetCodes,
    scanCondition,
    t,
  ]);

  const unreachableMessage = t("piScan.requestFailed");

  const pause = useCallback(
    () => settlePiScanSessionRequest(pausePiScanSession(), unreachableMessage),
    [unreachableMessage],
  );

  const resume = useCallback(
    () => settlePiScanSessionRequest(resumePiScanSession(), unreachableMessage),
    [unreachableMessage],
  );

  const stop = useCallback(
    () => settlePiScanSessionRequest(stopPiScanSession(), unreachableMessage),
    [unreachableMessage],
  );

  const emergencyStop = useCallback(
    () =>
      settlePiScanSessionRequest(
        emergencyStopPiScanSession(),
        unreachableMessage,
      ),
    [unreachableMessage],
  );

  const setAutoFeed = useCallback(
    (enabled: boolean) => {
      if (!piScanHoldsPort(state)) return;
      void settlePiScanSessionRequest(
        updatePiScanSettings({ autoFeed: enabled }),
        unreachableMessage,
      );
    },
    [state, unreachableMessage],
  );

  const feed = useCallback(() => {
    if (!piScanHoldsPort(state)) return;
    void settlePiScanSessionRequest(feedPiScanSession(), unreachableMessage);
  }, [state, unreachableMessage]);

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
    emergencyStop,
    feed,
    setAutoFeed,
  };
}
