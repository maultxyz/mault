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
import { useStandaloneDocumentFeeder } from "@/features/scanner/api/use-standalone-document-feeder";
import { FlatbedPlacementDialog } from "@/features/scanner/components/flatbed-placement-dialog";
import { FeederCardSetupDialog } from "@/features/scanner/components/feeder-card-setup-dialog";
import { documentScanErrorMessage } from "@/features/scanner/lib/document-scan-errors";
import { usePiScanSession } from "@/features/scanner/api/use-pi-scan-session";
import { piScanStatusText } from "@/features/scanner/lib/pi-scan-status";
import { useDesktopScannerControls } from "@/features/scanner/api/use-desktop-scanner-controls";
import { useFoilNudgeCheck } from "@/features/scanner/api/use-foil-nudge-check";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useDocumentScanArchive } from "@/features/scanner/api/use-document-scan-archive";
import { useScanRemoval } from "@/features/scanner/api/use-scan-removal";
import { useBinFillLevels } from "@/features/scanner/api/use-bin-fill-levels";
import { useSerial, useSerialMessage } from "@/features/scanner/api/use-serial";
import { useVerifyJam } from "@/features/scanner/api/use-verify-jam";
import { useStation, useStations } from "@/features/scanner/api/use-stations";
import { PhoneCameraPairingDialog } from "@/features/scanner/components/phone-camera-pairing-dialog";
import { ScannerControls } from "@/features/scanner/components/scanner-controls";
import { ScannerStatusBar } from "@/features/scanner/components/scanner-status-bar";
import { ScannerOverlay } from "@/features/scanner/components/scanner-overlay";
import { CameraConnectingOverlay } from "@/features/scanner/components/camera-connecting-overlay";
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
  STATION_ATTENTION_FIXES,
} from "@/lib/constants/scanner";
import { cn } from "@/lib/utils";
import type {
  CardScannerComponentProps,
  ScannerOverlayProps,
} from "@/lib/interfaces/scanner";
import {
  feedWithRetries,
  parseSerialReply,
  type ScannerStatus,
} from "@magic-vault/shared";
import { useFeederConfig } from "@/features/calibration/api/use-feeder-config";
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
import { isWebBluetoothSupported } from "@/lib/web-bluetooth";

export function CardScanner({
  className,
  compact,
  controlsPosition = "bottom",
  controlsContainer,
  renderChrome,
  viewerTouchesPanelEdges = false,
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
    pauseForAttention,
    reportScannerError,
    attention,
    reopenAttention,
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
    sorterLimitReason,
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
    takeDocumentScannerPages,
    flatbedPlacement,
  } = useCameraContext();
  const { t: tCards } = useTranslation("cards");
  const [flatbedPlacementOpen, setFlatbedPlacementOpen] = useState(false);
  const [feederCardSetupOpen, setFeederCardSetupOpen] = useState(false);
  const flatbedPlacementPromptedRef = useRef<string | null>(null);
  const { feederConfig } = useFeederConfig();
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
  const checkFoilByNudge = useFoilNudgeCheck();
  const archiveDocumentScan = useDocumentScanArchive();
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
    onSearchResults: (
      cards,
      capturedImageUrl,
      vectorizedOn,
      details,
      capturedBackImageUrl,
    ) => {
      if (isRemoveModeActive) {
        if (cards.length > 0) queueScannedCard(cards[0], cards.slice(1));
        else handleRemovalNoMatch();
        return;
      }
      if (cards.length > 0) {
        recordScanOutcome(true);
        const placement = addCard(
          cards[0],
          capturedImageUrl,
          cards.slice(1),
          vectorizedOn,
          details,
          capturedBackImageUrl,
        );
        archiveDocumentScan(placement, {
          cardName: cards[0].name,
          frontImageUrl: capturedImageUrl,
          backImageUrl: capturedBackImageUrl,
        });
      }
    },
    onNoMatch: (capturedImageUrl, vectorizedOn, details, capturedBackImageUrl) => {
      if (isRemoveModeActive) {
        handleRemovalNoMatch();
        return;
      }
      recordScanOutcome(false);
      const placement = addUnmatchedCard(
        capturedImageUrl,
        vectorizedOn,
        details,
        capturedBackImageUrl,
      );
      archiveDocumentScan(placement, {
        cardName: null,
        frontImageUrl: capturedImageUrl,
        backImageUrl: capturedBackImageUrl,
      });
    },
    rotated: previewRotated,
    onControlCode: (command) => void applyControlCode(command),
    checkFoilByNudge: isRemoveModeActive ? undefined : checkFoilByNudge,
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

  useEffect(() => {
    reportScannerError(status === "error" ? errorMessage : null);
  }, [status, errorMessage, reportScannerError]);
  useEffect(() => () => reportScannerError(null), [reportScannerError]);

  const wasActiveStationRef = useRef(isActive);
  useEffect(() => {
    const becameActive = isActive && !wasActiveStationRef.current;
    wasActiveStationRef.current = isActive;
    if (
      becameActive &&
      attention &&
      STATION_ATTENTION_FIXES[attention.kind] === "emptyBin" &&
      !binLimitReached &&
      !fullBins
    ) {
      reopenAttention();
    }
  }, [isActive, attention, binLimitReached, fullBins, reopenAttention]);

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
      const { sent, line: response } = await feedWithRetries(
        feedOneCard,
        (result) => (result.sent ? parseSerialReply(result.line) : null),
        ignoreIrSensors ? 0 : feederConfig.feedRetryCount,
      );
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
          pauseForAttention({ kind: "hopperEmpty" });
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
          pauseForAttention({ kind: "noCardDetected" });
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
    feederConfig.feedRetryCount,
    prepareDevice,
    feedOneCard,
    handleCardArrived,
    pauseForAttention,
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
      takeDocumentScannerPages();
    },
    onCardReady: handleCardArrived,
    onScanFailed: (reason) =>
      toast.error(t("flatbed.scanFailed"), {
        description: documentScanErrorMessage(tCards, reason),
      }),
    onModuleOneNotEmpty: () =>
      toast.error(t("documentScannerFeed.moduleOneNotEmpty")),
  });

  const isFeederMode =
    cameraSource === "document-scanner" &&
    documentScannerMode === "feeder" &&
    isCameraActive;
  const isStandaloneFeederMode = isFeederMode && !isConnected;

  const standaloneFeeder = useStandaloneDocumentFeeder({
    isEnabled: isStandaloneFeederMode,
    isAutoFeedEnabled: autoFeed,
    scannerStatus: status,
    feedDocumentScannerCard,
    discardDocumentScannerPage: () => {
      takeDocumentScannerPages();
    },
    onCardReady: handleCardArrived,
    onHopperEmpty: () => {
      pause();
      toast.info(t("feederEmpty.title"), {
        id: "document-scanner-hopper-empty",
        description: t("feederEmpty.description"),
      });
    },
    onFeedFailed: (reason) => {
      pause();
      toast.error(t("documentScannerFeed.scanFailed"), {
        description: documentScanErrorMessage(tCards, reason),
      });
    },
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
          documentScanErrorMessage(tCards, reason),
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
    tCards,
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
      onSetUpFeederCard={
        isFeederMode ? () => setFeederCardSetupOpen(true) : undefined
      }
      orientation={isSideControls ? "vertical" : "horizontal"}
      status={displayStatus}
      isConnected={isConnected}
      isReady={isReady}
      isFeeding={
        isFeeding ||
        standaloneFeeder.isFeeding ||
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
          : isStandaloneFeederMode
            ? standaloneFeeder.feedOneCard
            : handleFeed
      }
      standaloneFeeder={isStandaloneFeederMode}
      canFeedStandalone={standaloneFeeder.canFeedOneCard}
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
      <FeederCardSetupDialog
        open={feederCardSetupOpen}
        onOpenChange={setFeederCardSetupOpen}
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
        <canvas
          ref={displayCanvasRef}
          aria-label={t("a11y.cameraPreview")}
          className="absolute"
        />
        <canvas
          ref={overlayCanvasRef}
          aria-hidden
          className="absolute z-20 pointer-events-none"
        />
        <CameraConnectingOverlay />
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

  const showStatusStrip = !isSideControls;
  const overlayProps: ScannerOverlayProps = {
    status: displayStatus,
    errorMessage,
    isCameraActive,
    isConnected,
    isReady,
    sensorBlockedModule,
    onResolveSensorBlocked: reopenSensorBlockedToast,
    firmwareVersion,
    hasCatchAll,
    autoFeed: autoFeed || isStandaloneFeederMode,
    cameraSource,
    phonePairingStatus,
    hasStillPhoto,
    dailyLimitReached: isAtScanLimit,
    onRetryError: handleRetryError,
    cameraMenu: {
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
      isFeederSelected: isFeederMode,
      onSetUpFeederCard: () => setFeederCardSetupOpen(true),
      onOpenPhonePairing: handleOpenPhonePairing,
    },
    onOpenPhonePairing: handleOpenPhonePairing,
    onConnectScanner: connect,
    onConnectScannerBluetooth: connectBluetooth,
    onConnectScannerCloud: connectCloud,
    bluetoothSupported,
    handScanActive:
      handScanActive ||
      (isFlatbedMode && !isConnected) ||
      isStandaloneFeederMode,
    flatbedScan: isFlatbedMode ? flatbedScan : undefined,
    lastRoutedBin: visibleLastRoutedBin,
    onEnableHandScan: () => setHandScan(true),
    sessionLive: piScanLive || piScan.starting,
    piReady: piScan.cameraReady,
    sessionDetail:
      piScan.starting && !piScanLive
        ? t("piScan.starting")
        : piScanStatusText(t, piScan.state),
  };

  return (
    <div
      className={cn(
        "flex overflow-hidden gap-2",
        isSideControls ? "flex-row" : "flex-col-reverse md:flex-col",
        className,
      )}
    >
      <div className={showStatusStrip ? "flex flex-col" : "contents"}>
        <div
          className={cn(
            "relative isolate overflow-hidden rounded-card bg-card",
            viewerTouchesPanelEdges && "rounded-none border-b",
            isSideControls
              ? "h-full aspect-[2.5/3.5] shrink-0"
              : "w-full h-full max-w-full",
            !compact && !isSideControls && "md:aspect-[2.5/3.5]",
            isRemoveModeActive && "ring-2 ring-destructive ring-inset",
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
            aria-label={t("a11y.cameraPreview")}
            className={cn(
              "absolute",
              piRemote && "hidden",
              previewRotated && cameraSource === "local" && "rotate-90",
            )}
          />
          <canvas
            ref={overlayCanvasRef}
            aria-hidden
            className={cn(
              "absolute z-20 pointer-events-none",
              piRemote && "hidden",
              previewRotated && cameraSource === "local" && "rotate-90",
            )}
          />
          <CameraConnectingOverlay />
          {isAdmin && debugImageUrl && (
            <Tooltip>
              <TooltipTrigger
                aria-label={t("a11y.showLastSearchImage")}
                className="absolute bottom-2 left-2 z-30 flex items-center justify-center size-7 rounded-lg bg-background/70 text-foreground backdrop-blur-sm hover:bg-background/90 transition-colors">
                <IconEye size={16} />
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="max-w-none overflow-hidden rounded-xl bg-popover p-0 text-popover-foreground shadow-popover ring-1 ring-border"
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
            {...overlayProps}
            region={showStatusStrip ? "viewer" : "all"}
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
            isFeederSelected={isFeederMode}
            onSetUpFeederCard={() => setFeederCardSetupOpen(true)}
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
            sorterLimitReason={sorterLimitReason}
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
        {showStatusStrip && (
          <ScannerOverlay
            {...overlayProps}
            region="status-strip"
            statusStripTouchesPanelEdges={viewerTouchesPanelEdges}
          />
        )}
      </div>
      {isCameraActive && !controlsContainer && scannerControls}
      {isCameraActive &&
        controlsContainer &&
        createPortal(scannerControls, controlsContainer)}
      {dialogs}
    </div>
  );
}
