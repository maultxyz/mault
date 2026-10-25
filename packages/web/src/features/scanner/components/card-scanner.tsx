import { useDevice } from "@/features/calibration/api/use-device";
import { StaleDeviceDialog } from "@/components/stale-device-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useCollections } from "@/features/collections/api/use-collections";
import {
  reportSerialEvent,
} from "@/features/notifications/api/notification-settings";
import { useCardScanner } from "@/features/scanner/api/use-card-scanner";
import { useDesktopScannerControls } from "@/features/scanner/api/use-desktop-scanner-controls";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useBinFillLevels } from "@/features/scanner/api/use-bin-fill-levels";
import { useSerial, useSerialMessage } from "@/features/scanner/api/use-serial";
import { useVerifyJam } from "@/features/scanner/api/use-verify-jam";
import { useStation, useStations } from "@/features/scanner/api/use-stations";
import { PhoneCameraPairingDialog } from "@/features/scanner/components/phone-camera-pairing-dialog";
import { ScannerControls } from "@/features/scanner/components/scanner-controls";
import { ScannerMenu } from "@/features/scanner/components/scanner-menu";
import { ScannerOverlay } from "@/features/scanner/components/scanner-overlay";
import { EmptyBinToLocationDialog } from "@/features/storage/components/empty-bin-to-location-dialog";
import { useConnectWithStaleCheck } from "@/hooks/use-connect-with-stale-check";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useRole } from "@/hooks/use-role";
import {
  PAUSE_WHEN_HIDDEN_STATUSES,
  SESSION_TIMER_RUNNING_STATUSES,
} from "@/lib/constants/scanner";
import { cn } from "@/lib/utils";
import type { CardScannerComponentProps } from "@/lib/interfaces/scanner";
import { IconEye } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useResetToNeutral } from "@/features/scanner/api/use-reset-to-neutral";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useOnnxRuntimeFailureToast } from "@/features/scanner/api/use-onnx-runtime-failure-toast";
import { useUnmatchedRateToast } from "@/features/scanner/api/use-unmatched-rate-toast";
import { useSupportPrompt } from "@/features/billing/api/use-support-prompt";
import { useNavigate } from "react-router-dom";
import { useStationToast } from "@/features/scanner/api/use-station-toast";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import type { EmptyBinOptions } from "@magic-vault/shared";
import { useIgnoreIrSensors } from "@/features/scanner/lib/ignore-ir-sensors";
import { useHandScan } from "@/features/scanner/lib/hand-scan";

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
  const {
    addCard,
    addUnmatchedCard,
    autoFeed,
    setAutoFeed,
    registerCardArrivedHook,
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
    binFillLevels.find((level) => level.binNumber === binLimitReached?.binNumber)
      ?.capacity ?? null;
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
  } = useSerial();
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
  const bluetoothSupported =
    typeof navigator !== "undefined" && !!navigator.bluetooth;
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
  const { hasCatchAll, selectedSet } = useBinConfigs();
  const { activeCollection } = useCollections();
  const { recordScanOutcome } = useUnmatchedRateToast();
  useOnnxRuntimeFailureToast();
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
    hasPhonePhoto,
    isAtScanLimit,
  } = useCardScanner({
    onSearchResults: (cards, capturedImageUrl, vectorizedOn, details) => {
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
      recordScanOutcome(false);
      addUnmatchedCard(capturedImageUrl, vectorizedOn, details);
    },
    rotated: !isMobile,
    autoCapture: handScanActive,
  });
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
  }, [toast, pause, t]);

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
      const { sent, line: response } = await sendRequest(
        { feeder: true },
        10000,
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
    sendRequest,
    handleCardArrived,
    handlePause,
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
      if (!response) return false;
      const parsed = JSON.parse(response) as Record<string, unknown>;
      return Array.isArray(parsed.ir) && !parsed.ir[0];
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
    enabled: isActive,
    isConnected,
    isReady,
    autoFeed,
    isClearingDevice,
    onPause: pause,
    onResume: () => void handleResumeScanning(),
    onToggleAutoFeed: () => setAutoFeed(!autoFeed),
    onClearDevice: () => void handleClearDevice(),
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
    if (!canScan && wasReadyRef.current) {
      handlePause();
    }
    if (canScan && !wasReadyRef.current && status === "paused") {
      handleResume();
    }
    wasReadyRef.current = canScan;
  }, [canScan, handlePause, handleResume, status]);

  const scannerControls = (
    <ScannerControls
      orientation={isSideControls ? "vertical" : "horizontal"}
      status={status}
      isConnected={isConnected}
      isReady={isReady}
      isFeeding={isFeeding}
      isClearingDevice={isClearingDevice}
      onForceScan={handleForceScanClick}
      onPause={pause}
      onResume={handleResumeScanning}
      onFeed={handleFeed}
      onClearDevice={handleClearDevice}
      isResettingDevice={isResettingDevice}
      onResetDevice={handleResetToNeutral}
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
      <div className={cn("relative isolate overflow-hidden bg-black", className)}>
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
          lastRoutedBin,
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
        )}
      >
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas
          ref={displayCanvasRef}
          className={cn(
            "absolute",
            !isMobile && cameraSource === "local" && "rotate-90",
          )}
        />
        <canvas
          ref={overlayCanvasRef}
          className={cn(
            "absolute z-20 pointer-events-none",
            !isMobile && cameraSource === "local" && "rotate-90",
          )}
        />
        {isAdmin && debugImageUrl && (
          <Tooltip>
            <TooltipTrigger className="absolute top-2 left-2 z-30 flex items-center justify-center size-7 rounded-lg bg-background/70 text-foreground backdrop-blur-sm hover:bg-background/90 transition-colors">
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
          status={status}
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
          hasPhonePhoto={hasPhonePhoto}
          dailyLimitReached={isAtScanLimit}
          onRetryError={handleRetryError}
          onConnectCamera={handleRetryError}
          onOpenPhonePairing={handleOpenPhonePairing}
          onConnectScanner={connect}
          onConnectScannerBluetooth={connectBluetooth}
          onConnectScannerCloud={connectCloud}
          bluetoothSupported={bluetoothSupported}
          handScanActive={handScanActive}
          lastRoutedBin={lastRoutedBin}
          onEnableHandScan={() => setHandScan(true)}
        />
        <ScannerMenu
          isCameraActive={isCameraActive}
          isConnected={isConnected}
          autoFeed={autoFeed}
          allowDuplicates={allowDuplicates}
          cameras={cameras}
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
          onAutoFeedChange={setAutoFeed}
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
