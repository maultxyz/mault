import { useDevice } from "@/features/calibration/api/use-device";
import { StaleDeviceDialog } from "@/components/stale-device-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useCollections } from "@/features/collections/api/use-collections";
import { reportSerialEvent } from "@/features/notifications/api/notification-settings";
import { useCameraContext } from "@/features/scanner/api/use-camera";
import { useCardScanner } from "@/features/scanner/api/use-card-scanner";
import { feedCardFromDocumentScanner } from "@/features/scanner/lib/document-scanner-feed";
import { useFlatbedScan } from "@/features/scanner/api/use-flatbed-scan";
import { FlatbedPlacementDialog } from "@/features/scanner/components/flatbed-placement-dialog";
import { usePiScanSession } from "@/features/scanner/api/use-pi-scan-session";
import { piScanStatusText } from "@/features/scanner/lib/pi-scan-status";
import { useDesktopScannerControls } from "@/features/scanner/api/use-desktop-scanner-controls";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useScanRemoval } from "@/features/scanner/api/use-scan-removal";
import { useBinFillLevels } from "@/features/scanner/api/use-bin-fill-levels";
import { useSerial, useSerialMessage } from "@/features/scanner/api/use-serial";
import { useVerifyJam } from "@/features/scanner/api/use-verify-jam";
import { useStation, useStations } from "@/features/scanner/api/use-stations";
import { PhoneCameraPairingDialog } from "@/features/scanner/components/phone-camera-pairing-dialog";
import { ScannerControls } from "@/features/scanner/components/scanner-controls";
import { ScannerStatusBar } from "@/features/scanner/components/scanner-status-bar";
import { ScannerOverlay } from "@/features/scanner/components/scanner-overlay";
import { PiCameraPreview } from "@/features/scanner/components/pi-camera-preview";
import { EmptyBinToLocationDialog } from "@/features/storage/components/empty-bin-to-location-dialog";
import { useConnectWithStaleCheck } from "@/hooks/use-connect-with-stale-check";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { usePiHost } from "@/hooks/use-pi-host";
import { isRemoteBrowser } from "@/lib/host";
import { useRole } from "@/hooks/use-role";
import {
  PAUSE_WHEN_HIDDEN_STATUSES,
  SESSION_TIMER_RUNNING_STATUSES,
} from "@/lib/constants/scanner";
import { cn } from "@/lib/utils";
import type { CardScannerComponentProps } from "@/lib/interfaces/scanner";
import type { ScannerStatus } from "@magic-vault/shared";
import { IconEye } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useResetToNeutral } from "@/features/scanner/api/use-reset-to-neutral";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useOnnxRuntimeFailureToast } from "@/features/scanner/api/use-onnx-runtime-failure-toast";
import { useUnmatchedRateToast } from "@/features/scanner/api/use-unmatched-rate-toast";
import { useApplyScannerControlCode } from "@/features/scanner/api/use-apply-scanner-control-code";
import { useSupportPrompt } from "@/features/billing/api/use-support-prompt";
import { useNavigate } from "react-router-dom";
import { useStationToast } from "@/features/scanner/api/use-station-toast";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import type { EmptyBinOptions } from "@magic-vault/shared";
import { useIgnoreIrSensors } from "@/features/scanner/lib/ignore-ir-sensors";
import { useHandScan } from "@/features/scanner/lib/hand-scan";
import { parseSerialReply } from "@magic-vault/shared";
import { isWebBluetoothSupported } from "@/lib/web-bluetooth";

export function CardScanner({
  className,
  compact,
  controlsPosition = "bottom",
  controlsContainer,
  renderChrome,
}: CardScannerComponentProps) {
  const { t } = useTranslation("scanner");
  const toast = useStationToast();
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const isMobile = useIsMobile();
  const piHost = usePiHost();
  const piRemote = piHost && isRemoteBrowser();
  const previewRotated = !isMobile || (piHost && isRemoteBrowser());
  const {
    addCard,
    addUnmatchedCard,
    autoFeed,
    setAutoFeed,
    registerCardArrivedHook,
    registerFeedSource,
    feedOneCard,
    registerPauseHook,
    registerResumeHook,
    pause,
    isFeedHalted,
    clearFeedHalt,
    showJamToast,
    binLimitReached,
    resolveBinLimit,
    dismissBinLimit,
    fullBins,
    fullBinCount,
    emptyNextFullBin,
    dismissFullBins,
    setScannerRunning,
    lastRoutedBin,
  } = useScannedCards();
  const binFillLevels = useBinFillLevels();
  const binLimitCapacity =
    binFillLevels.find(
      (level) => level.binNumber === binLimitReached?.binNumber,
    )?.capacity ?? null;
  const { station, isActive } = useStation();
  const {
    setActiveStation,
    connectAnotherSorter,
    connectAnotherSorterCloud,
    canConnectAnotherSorter,
    sorterLimitIsHardCap,
  } = useStations();
  const {
    isConnected,
    isReady,
    sensorBlockedModule,
    reopenSensorBlockedToast,
    firmwareVersion,
    disconnect,
    sendTest,
    sendRequest,
    readIR,
  } = useSerial();
  const {
    documentScannerOptions,
    documentScannerMode,
    isSimulatedDocumentScanner,
    feedDocumentScannerCard,
    scanFlatbedCard,
    takeDocumentScannerPage,
    flatbedPlacement,
  } = useCameraContext();
  const { t: tCards } = useTranslation("cards");
  const [flatbedPlacementOpen, setFlatbedPlacementOpen] = useState(false);
  const flatbedPlacementPromptedRef = useRef<string | null>(null);
  const device = useDevice();
  const {
    connect,
    connectBluetooth,
    connectCloud,
    staleDialogOpen,
    onDismissStaleDialog,
    onRunTest,
    onCalibrateFirst,
  } = useConnectWithStaleCheck();
  const bluetoothSupported = isWebBluetoothSupported();
  const [isFeeding, setIsFeeding] = useState(false);
  const [isClearingDevice, setIsClearingDevice] = useState(false);
  const {
    resetToNeutral,
    handleResetToNeutral,
    isResetting: isResettingDevice,
  } = useResetToNeutral();
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [handScan, setHandScan] = useHandScan();
  const handScanActive = handScan && !isConnected;
  const { isRemoveModeActive, queueScannedCard, handleRemovalNoMatch } =
    useScanRemoval();
  const visibleLastRoutedBin = isRemoveModeActive ? null : lastRoutedBin;
  const { hasCatchAll, selectedSet } = useBinConfigs();
  const { activeCollection } = useCollections();
  const piScan = usePiScanSession();
  const setPiAutoFeed = piScan.setAutoFeed;
  const changeAutoFeed = useCallback(
    (enabled: boolean) => {
      setAutoFeed(enabled);
      setPiAutoFeed(enabled);
    },
    [setPiAutoFeed, setAutoFeed],
  );
  const piWaitingForFeed =
    piScan.state.phase === "running" &&
    !piScan.state.autoFeed &&
    piScan.state.activity == null;
  const { recordScanOutcome } = useUnmatchedRateToast();
  useOnnxRuntimeFailureToast();
  const setAllowDuplicatesRef = useRef<(allowDuplicates: boolean) => void>(
    () => {},
  );
  const applyControlCode = useApplyScannerControlCode(
    useCallback(
      (allowDuplicates: boolean) =>
        setAllowDuplicatesRef.current(allowDuplicates),
      [],
    ),
  );
  const {
    status,
    errorMessage,
    isCameraActive,
    debugImageUrl,
    videoRef,
    displayCanvasRef,
    overlayCanvasRef,
    captureCard,
    handleForceScan,
    handlePause,
    handleResume,
    handleRetryError,
    handleStopCamera,
    cameras,
    selectedCameraId,
    selectCamera,
    allowDuplicates,
    setAllowDuplicates,
    cameraSource,
    phonePairingStatus,
    phonePairingUrl,
    startPhonePairing,
    stopPhonePairing,
    hasStillPhoto,
    isAtScanLimit,
  } = useCardScanner({
    onSearchResults: (cards, capturedImageUrl, vectorizedOn, details) => {
      if (isRemoveModeActive) {
        if (cards.length > 0) queueScannedCard(cards[0], cards.slice(1));
        else handleRemovalNoMatch();
        return;
      }
      if (cards.length > 0) {
        recordScanOutcome(true);
        addCard(
          cards[0],
          capturedImageUrl,
          cards.slice(1),
          vectorizedOn,
          details,
        );
      }
    },
    onNoMatch: (capturedImageUrl, vectorizedOn, details) => {
      if (isRemoveModeActive) {
        handleRemovalNoMatch();
        return;
      }
      recordScanOutcome(false);
      addUnmatchedCard(capturedImageUrl, vectorizedOn, details);
    },
    rotated: previewRotated,
    onControlCode: (command) => void applyControlCode(command),
    autoCapture: handScanActive,
    skipDuplicateCheck: isRemoveModeActive,
  });
  const piScanLive =
    piScan.state.phase === "running" || piScan.state.phase === "paused";
  const displayStatus: ScannerStatus = piScanLive
    ? piScan.state.phase === "running"
      ? "scanning"
      : "paused"
    : piRemote && piScan.cameraReady
      ? "paused"
      : status;
  setAllowDuplicatesRef.current = setAllowDuplicates;
  const isSideControls = controlsPosition === "side";

  const handleOpenPhonePairing = () => {
    setPhoneDialogOpen(true);
    if (phonePairingStatus === "idle" || phonePairingStatus === "error")
      startPhonePairing();
  };

  const handlePhoneDialogOpenChange = (open: boolean) => {
    setPhoneDialogOpen(open);
    if (!open && phonePairingStatus !== "connected") stopPhonePairing();
  };
  const scanningBlocked = isAtScanLimit;

  const verifyJam = useVerifyJam();
  const [ignoreIrSensors] = useIgnoreIrSensors();

  useSerialMessage((msg) => {
    if (
      typeof msg === "object" &&
      msg !== null &&
      "error" in msg &&
      (msg as Record<string, unknown>).error === "jam"
    ) {
      if (!SESSION_TIMER_RUNNING_STATUSES.includes(status)) return;
      if (ignoreIrSensors) return;

      const raw = msg as Record<string, unknown>;
      const module = Number(raw.module);

      void verifyJam(module).then((confirmed) => {
        if (!confirmed) return;
        pause();
        showJamToast({
          module,
          binNumber: raw.bin ? Number(raw.bin) : undefined,
        });
        void reportSerialEvent({
          command: "jam",
          sent: true,
          response: raw,
          collectionGuid: activeCollection?.guid,
          deviceGuid: device?.guid,
        });
      });
    }
  });

  const heldCardArrivalRef = useRef(false);

  const handleCardArrived = useCallback(() => {
    if (document.hidden || isFeedHalted()) {
      heldCardArrivalRef.current = true;
      return;
    }
    if (status === "paused") handleResume();
    captureCard();
  }, [status, handleResume, captureCard, isFeedHalted]);

  const handleResumeClick = useCallback(() => {
    handleResume();
    if (heldCardArrivalRef.current) {
      heldCardArrivalRef.current = false;
      captureCard();
    }
  }, [handleResume, captureCard]);

  useEffect(() => {
    setScannerRunning(SESSION_TIMER_RUNNING_STATUSES.includes(status));
  }, [status, setScannerRunning]);

  useEffect(() => () => setScannerRunning(false), [setScannerRunning]);

  useSupportPrompt(status);

  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    const onVisibilityChange = () => {
      if (piScan.cameraReady) return;
      if (!document.hidden) return;
      if (!PAUSE_WHEN_HIDDEN_STATUSES.includes(statusRef.current)) return;
      pause();
      toast.info(t("cardScanner.pausedTabHidden.title"), {
        id: "scanner-paused-tab-hidden",
        description: t("cardScanner.pausedTabHidden.description"),
      });
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [toast, pause, piScan.cameraReady, t]);

  const deviceNeutralRef = useRef(false);

  useEffect(() => {
    if (status === "paused" || !isReady) deviceNeutralRef.current = false;
  }, [status, isReady]);

  const prepareDevice = useCallback(async () => {
    if (!isReady || deviceNeutralRef.current) return true;
    deviceNeutralRef.current = await resetToNeutral();
    return deviceNeutralRef.current;
  }, [isReady, resetToNeutral]);

  const handleFeed = useCallback(async () => {
    if (!isReady) return;
    setIsFeeding(true);
    try {
      if (!(await prepareDevice())) return;
      const { sent, line: response } = await feedOneCard();
      if (!sent) {
        toast.error(t("cardScanner.feedFailed.title"), {
          description: t("feederCommandFailedDescription"),
        });
        void reportSerialEvent({
          command: "feeder",
          sent: false,
          response: null,
          collectionGuid: activeCollection?.guid,
          deviceGuid: device?.guid,
        });
        return;
      }
      if (!response) {
        toast.error(t("cardScanner.feedTimeout.title"), {
          description: t("feederTimeoutDescription"),
        });
        void reportSerialEvent({
          command: "feeder",
          sent: true,
          response: null,
          collectionGuid: activeCollection?.guid,
          deviceGuid: device?.guid,
        });
        return;
      }
      try {
        const parsed = JSON.parse(response) as Record<string, unknown>;
        if (parsed.empty && !ignoreIrSensors) {
          pause();
          toast.error(t("feederEmpty.title"), {
            description: t("feederEmpty.description"),
            duration: Infinity,
            dismissible: true,
          });
          void reportSerialEvent({
            command: "feeder",
            sent: true,
            response: parsed,
            collectionGuid: activeCollection?.guid,
            deviceGuid: device?.guid,
          });
        } else if (parsed.error) {
          toast.error(t("feederError.title"), {
            description: String(parsed.error),
            duration: Infinity,
            dismissible: true,
          });
          void reportSerialEvent({
            command: "feeder",
            sent: true,
            response: parsed,
            collectionGuid: activeCollection?.guid,
            deviceGuid: device?.guid,
          });
        } else if (parsed.detected === false && !ignoreIrSensors) {
          pause();
          toast.error(t("cardScanner.noCardDetected.title"), {
            description: t("cardScanner.noCardDetected.description"),
          });
          void reportSerialEvent({
            command: "feeder",
            sent: true,
            response: parsed,
            collectionGuid: activeCollection?.guid,
            deviceGuid: device?.guid,
          });
        } else {
          handleCardArrived();
        }
      } catch {
        toast.error(t("cardScanner.feedError.title"), {
          description: t("feederUnexpectedResponseDescription"),
        });
        void reportSerialEvent({
          command: "feeder",
          sent: true,
          response,
          collectionGuid: activeCollection?.guid,
          deviceGuid: device?.guid,
        });
      }
    } finally {
      setIsFeeding(false);
    }
  }, [
    toast,
    isReady,
    ignoreIrSensors,
    prepareDevice,
    feedOneCard,
    handleCardArrived,
    pause,
    t,
    activeCollection?.guid,
    device?.guid,
  ]);

  const handleClearDevice = useCallback(async () => {
    if (!isReady) return;
    setIsClearingDevice(true);
    try {
      const { sent, line: response } = await sendRequest(
        { clearDevice: true },
        10000,
      );
      if (!sent) {
        toast.error(t("cardScanner.clearFailed.title"), {
          description: t("cardScanner.clearFailed.description"),
        });
        return;
      }
      if (!response) {
        toast.error(t("cardScanner.clearTimeout.title"), {
          description: t("cardScanner.clearTimeout.description"),
        });
        return;
      }
      toast.success(t("cardScanner.deviceCleared.title"), {
        description: t("cardScanner.deviceCleared.description"),
      });
    } finally {
      setIsClearingDevice(false);
    }
  }, [toast, isReady, sendRequest, t]);

  const isModuleOneEmpty = useCallback(async () => {
    if (!isReady || ignoreIrSensors) return false;
    try {
      const { line: response } = await sendRequest({ readIR: true }, 2000);
      const parsed = parseSerialReply(response);
      return Array.isArray(parsed?.ir) && !parsed.ir[0];
    } catch {
      return false;
    }
  }, [isReady, ignoreIrSensors, sendRequest]);

  const handleForceScanClick = useCallback(async () => {
    if (await isModuleOneEmpty()) {
      toast.error(t("cardScanner.noCardDetected.title"), {
        description: t("cardScanner.noCardDetected.description"),
      });
      return;
    }
    handleForceScan();
  }, [toast, isModuleOneEmpty, handleForceScan, t]);

  useEffect(() => {
    return registerCardArrivedHook(handleCardArrived);
  }, [registerCardArrivedHook, handleCardArrived]);

  const isFlatbedMode =
    cameraSource === "document-scanner" &&
    documentScannerMode === "flatbed" &&
    isCameraActive;

  const flatbedScan = useFlatbedScan({
    isEnabled: isFlatbedMode,
    hasSorter: isConnected,
    ignoreIrSensors,
    scannerStatus: status,
    readIR,
    scanFlatbedCard,
    discardDocumentScannerPage: () => {
      takeDocumentScannerPage();
    },
    onCardReady: handleCardArrived,
    onScanFailed: (reason) =>
      toast.error(t("flatbed.scanFailed"), {
        description: tCards(`importScans.documentScan.errors.${reason}`),
      }),
    onModuleOneNotEmpty: () =>
      toast.error(t("documentScannerFeed.moduleOneNotEmpty")),
  });

  useEffect(() => {
    if (isFlatbedMode && autoFeed) setAutoFeed(false);
  }, [isFlatbedMode, autoFeed, setAutoFeed]);

  useEffect(() => {
    if (!isFlatbedMode || flatbedPlacement || !selectedCameraId) return;
    if (flatbedPlacementPromptedRef.current === selectedCameraId) return;
    flatbedPlacementPromptedRef.current = selectedCameraId;
    setFlatbedPlacementOpen(true);
  }, [isFlatbedMode, flatbedPlacement, selectedCameraId]);

  useEffect(() => {
    if (cameraSource !== "document-scanner" || documentScannerMode !== "feeder") return;
    return registerFeedSource(() =>
      feedCardFromDocumentScanner({
        feedDocumentScannerCard,
        readIR,
        ignoreIrSensors,
        describeScannerError: (reason) =>
          t(`importScans.documentScan.errors.${reason}`, { ns: "cards" }),
        deliverCardWithSorterFeeder: isSimulatedDocumentScanner
          ? () => sendRequest({ feeder: true }, 10000)
          : undefined,
        onFlatbedPageScanned: () =>
          toast.info(t("documentScannerFeed.moveFlatbedCard.title"), {
            id: "document-scanner-move-flatbed-card",
            description: t("documentScannerFeed.moveFlatbedCard.description"),
          }),
        cardDidNotArriveMessage: t("documentScannerFeed.cardDidNotArrive"),
        moduleOneNotEmptyMessage: t("documentScannerFeed.moduleOneNotEmpty"),
      }),
    );
  }, [
    cameraSource,
    documentScannerMode,
    registerFeedSource,
    feedDocumentScannerCard,
    isSimulatedDocumentScanner,
    sendRequest,
    readIR,
    ignoreIrSensors,
    toast,
    t,
  ]);

  useEffect(() => {
    return registerPauseHook(handlePause);
  }, [registerPauseHook, handlePause]);

  const handleResumeScanning = useCallback(async () => {
    if (!(await prepareDevice())) return;
    clearFeedHalt();
    if (heldCardArrivalRef.current && (await isModuleOneEmpty())) {
      heldCardArrivalRef.current = false;
    }
    if (heldCardArrivalRef.current) {
      handleResumeClick();
      return;
    }
    handleResume();
    if (autoFeed) void handleFeed();
  }, [
    prepareDevice,
    clearFeedHalt,
    isModuleOneEmpty,
    handleResumeClick,
    handleResume,
    handleFeed,
    autoFeed,
  ]);

  useDesktopScannerControls({
    status,
    enabled: isActive && !piScan.cameraReady,
    isConnected,
    isReady,
    autoFeed,
    isClearingDevice,
    onPause: pause,
    onResume: () => void handleResumeScanning(),
    onToggleAutoFeed: () => setAutoFeed(!autoFeed),
    onClearDevice: () => void handleClearDevice(),
    flatbedScan: isFlatbedMode ? flatbedScan : undefined,
  });

  useEffect(() => {
    return registerResumeHook(handleResumeScanning);
  }, [registerResumeHook, handleResumeScanning]);

  const handleContinueAfterBinLimit = useCallback(
    async (options: EmptyBinOptions) => {
      if (await resolveBinLimit(options)) handleResumeScanning();
    },
    [resolveBinLimit, handleResumeScanning],
  );

  const handleEmptyNextFullBin = useCallback(
    async (options: EmptyBinOptions) => {
      if (await emptyNextFullBin(options)) handleResumeScanning();
    },
    [emptyNextFullBin, handleResumeScanning],
  );

  const canScan = isCameraActive;
  const wasReadyRef = useRef(canScan);
  useEffect(() => {
    if (piScan.cameraReady) {
      wasReadyRef.current = canScan;
      return;
    }
    if (!canScan && wasReadyRef.current) {
      handlePause();
    }
    if (canScan && !wasReadyRef.current && status === "paused") {
      handleResume();
    }
    wasReadyRef.current = canScan;
  }, [canScan, handlePause, handleResume, piScan.cameraReady, status]);

  const scannerControls = (
    <ScannerControls
      flatbedScan={isFlatbedMode ? flatbedScan : undefined}
      onCalibrateFlatbed={() => setFlatbedPlacementOpen(true)}
      orientation={isSideControls ? "vertical" : "horizontal"}
      status={displayStatus}
      isConnected={isConnected}
      isReady={isReady}
      isFeeding={
        isFeeding ||
        piScan.starting ||
        (piScan.state.phase === "running" && !piWaitingForFeed)
      }
      isClearingDevice={isClearingDevice}
      onForceScan={handleForceScanClick}
      onPause={piScan.cameraReady ? () => void piScan.pause() : pause}
      onResume={
        piScan.cameraReady
          ? () => void piScan.startOrResume()
          : handleResumeScanning
      }
      onFeed={
        piScan.cameraReady
          ? () => {
              if (
                piScan.state.phase === "running" ||
                piScan.state.phase === "paused"
              ) {
                piScan.feed();
                return;
              }
              void piScan.startOrResume();
            }
          : handleFeed
      }
      onClearDevice={handleClearDevice}
      sessionFeed={piScan.cameraReady}
      sessionLive={piScanLive}
      onStop={() => void piScan.stop()}
      onAutoFeedChange={changeAutoFeed}
    />
  );

  const dialogs = (
    <>
      <PhoneCameraPairingDialog
        open={phoneDialogOpen}
        onOpenChange={handlePhoneDialogOpenChange}
        status={phonePairingStatus}
        pairingUrl={phonePairingUrl}
        onRetry={startPhonePairing}
        onDisconnect={() => {
          stopPhonePairing();
          setPhoneDialogOpen(false);
        }}
      />
      <EmptyBinToLocationDialog
        binNumber={binLimitReached?.binNumber ?? null}
        title={t("binLimitDialog.title", {
          number: binLimitReached?.binNumber,
        })}
        description={t("binLimitDialog.description", {
          number: binLimitReached?.binNumber,
          limit: binLimitCapacity,
        })}
        dismissLabel={t("binLimitDialog.notNow")}
        preferLocation={!!selectedSet?.isChaosMode}
        collectionGuid={activeCollection?.guid}
        onOpenChange={(open) => {
          if (!open) dismissBinLimit();
        }}
        onConfirm={handleContinueAfterBinLimit}
      />
      <EmptyBinToLocationDialog
        binNumber={fullBins?.[0] ?? null}
        description={
          selectedSet?.isRepackMode
            ? t("repackCompleteDialog.description", { bin: fullBins?.[0] })
            : undefined
        }
        step={
          fullBins
            ? {
                index: fullBinCount - fullBins.length + 1,
                total: fullBinCount,
              }
            : undefined
        }
        collectionGuid={activeCollection?.guid}
        onOpenChange={(open) => {
          if (!open) dismissFullBins();
        }}
        onConfirm={handleEmptyNextFullBin}
      />
      <FlatbedPlacementDialog
        open={flatbedPlacementOpen}
        onOpenChange={setFlatbedPlacementOpen}
      />
      <StaleDeviceDialog
        open={staleDialogOpen}
        onOpenChange={(open) => {
          if (!open) onDismissStaleDialog();
        }}
        onRunTest={onRunTest}
        onCalibrateFirst={onCalibrateFirst}
      />
    </>
  );

  if (renderChrome) {
    return (
      <div
        className={cn("relative isolate overflow-hidden bg-black", className)}
      >
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={displayCanvasRef} className="absolute" />
        <canvas
          ref={overlayCanvasRef}
          className="absolute z-20 pointer-events-none"
        />
        {renderChrome({
          status,
          errorMessage,
          isCameraActive,
          isConnected,
          isReady,
          sensorBlockedModule,
          firmwareVersion,
          hasCatchAll,
          autoFeed,
          allowDuplicates,
          isAtScanLimit,
          bluetoothSupported,
          cameras,
          selectedCameraId,
          onPause: pause,
          onResume: () => void handleResumeScanning(),
          onScanOnce: () => void handleForceScanClick(),
          onRetry: handleRetryError,
          onConnectBluetooth: connectBluetooth,
          onResolveSensorBlocked: reopenSensorBlockedToast,
          onSelectCamera: selectCamera,
          onAutoFeedChange: setAutoFeed,
          onAllowDuplicatesChange: setAllowDuplicates,
          isFeeding,
          isClearingDevice,
          isResettingDevice,
          onFeed: () => void handleFeed(),
          onClearDevice: () => void handleClearDevice(),
          onResetDevice: () => void handleResetToNeutral(),
          handScan,
          handScanActive,
          lastRoutedBin: visibleLastRoutedBin,
          onHandScanChange: setHandScan,
        })}
        {dialogs}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex overflow-hidden gap-2",
        isSideControls ? "flex-row" : "flex-col-reverse md:flex-col",
        className,
      )}
    >
      <div
        className={cn(
          "relative isolate overflow-hidden bg-background rounded-lg border",
          isSideControls
            ? "h-full aspect-[2.5/3.5] shrink-0"
            : "w-full h-full max-w-full",
          !compact && !isSideControls && "md:aspect-[2.5/3.5]",
          isRemoveModeActive && "border-destructive ring-2 ring-destructive/40",
        )}
      >
        <video ref={videoRef} className="hidden" playsInline muted />
        {piRemote && isCameraActive && (
          <PiCameraPreview
            alt={t("piScan.preview")}
            rotated
            flipped={device?.flipCamera}
            className="absolute max-w-none"
          />
        )}
        <canvas
          ref={displayCanvasRef}
          className={cn(
            "absolute",
            piRemote && "hidden",
            previewRotated && cameraSource === "local" && "rotate-90",
          )}
        />
        <canvas
          ref={overlayCanvasRef}
          className={cn(
            "absolute z-20 pointer-events-none",
            piRemote && "hidden",
            previewRotated && cameraSource === "local" && "rotate-90",
          )}
        />
        {isAdmin && debugImageUrl && (
          <Tooltip>
            <TooltipTrigger className="absolute bottom-2 left-2 z-30 flex items-center justify-center size-7 rounded-lg bg-background/70 text-foreground backdrop-blur-sm hover:bg-background/90 transition-colors">
              <IconEye size={16} />
            </TooltipTrigger>
            <TooltipContent
              side="right"
              className="bg-background text-foreground border border-border p-0 shadow-lg max-w-none"
            >
              <img
                src={debugImageUrl}
                alt={t("cardScanner.lastSearchImageAlt")}
                className="w-48 aspect-[2.5/3.5] object-fill"
              />
            </TooltipContent>
          </Tooltip>
        )}
        <ScannerOverlay
          status={displayStatus}
          errorMessage={errorMessage}
          isCameraActive={isCameraActive}
          isConnected={isConnected}
          isReady={isReady}
          sensorBlockedModule={sensorBlockedModule}
          onResolveSensorBlocked={reopenSensorBlockedToast}
          firmwareVersion={firmwareVersion}
          hasCatchAll={hasCatchAll}
          autoFeed={autoFeed}
          cameraSource={cameraSource}
          phonePairingStatus={phonePairingStatus}
          hasStillPhoto={hasStillPhoto}
          dailyLimitReached={isAtScanLimit}
          onRetryError={handleRetryError}
          cameraMenu={{
            isCameraActive,
            cameras,
            documentScannerOptions,
            isFlatbedSelected: isFlatbedMode,
            selectedCameraId,
            phonePairingStatus,
            scanningBlocked,
            onCameraConnect: handleRetryError,
            onCameraDisconnect: handleStopCamera,
            onCameraSelect: selectCamera,
            onCalibrateFlatbed: () => setFlatbedPlacementOpen(true),
            onOpenPhonePairing: handleOpenPhonePairing,
          }}
          onOpenPhonePairing={handleOpenPhonePairing}
          onConnectScanner={connect}
          onConnectScannerBluetooth={connectBluetooth}
          onConnectScannerCloud={connectCloud}
          bluetoothSupported={bluetoothSupported}
          handScanActive={handScanActive || (isFlatbedMode && !isConnected)}
          flatbedScan={isFlatbedMode ? flatbedScan : undefined}
          lastRoutedBin={visibleLastRoutedBin}
          onEnableHandScan={() => setHandScan(true)}
          sessionLive={piScanLive || piScan.starting}
          piReady={piScan.cameraReady}
          sessionDetail={
            piScan.starting && !piScanLive
              ? t("piScan.starting")
              : piScanStatusText(t, piScan.state)
          }
        />
        <ScannerStatusBar
          isCameraActive={isCameraActive}
          isConnected={isConnected}
          autoFeed={autoFeed}
          allowDuplicates={allowDuplicates}
          cameras={cameras}
          documentScannerOptions={documentScannerOptions}
          isFlatbedSelected={isFlatbedMode}
          onCalibrateFlatbed={() => setFlatbedPlacementOpen(true)}
          selectedCameraId={selectedCameraId}
          phonePairingStatus={phonePairingStatus}
          scanningBlocked={scanningBlocked}
          onCameraConnect={handleRetryError}
          onCameraDisconnect={handleStopCamera}
          onCameraSelect={selectCamera}
          onOpenPhonePairing={handleOpenPhonePairing}
          onScannerConnect={connect}
          onScannerConnectBluetooth={connectBluetooth}
          onScannerConnectCloud={connectCloud}
          bluetoothSupported={bluetoothSupported}
          onScannerDisconnect={disconnect}
          onScannerRetry={sendTest}
          onCalibrate={() => {
            setActiveStation(station.id);
            navigate("/app/calibrate");
          }}
          onConnectAnotherUsb={() => connectAnotherSorter("usb")}
          onConnectAnotherBluetooth={() => connectAnotherSorter("bluetooth")}
          onConnectAnotherCloud={connectAnotherSorterCloud}
          canConnectAnotherSorter={canConnectAnotherSorter}
          sorterLimitIsHardCap={sorterLimitIsHardCap}
          onUpgrade={() => navigate(SETTINGS_PATHS.billing)}
          isReady={isReady}
          isClearingDevice={isClearingDevice}
          isResettingDevice={isResettingDevice}
          onClearDevice={() => void handleClearDevice()}
          onResetDevice={() => void handleResetToNeutral()}
          onAutoFeedChange={changeAutoFeed}
          onAllowDuplicatesChange={setAllowDuplicates}
          handScan={handScan}
          onHandScanChange={setHandScan}
        />
      </div>
      {isCameraActive && !controlsContainer && scannerControls}
      {isCameraActive &&
        controlsContainer &&
        createPortal(scannerControls, controlsContainer)}
      {dialogs}
    </div>
  );
}
