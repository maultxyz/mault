import { StaleDeviceDialog } from "@/components/stale-device-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useCollections } from "@/features/collections/api/use-collections";
import { useGameApiHealthCheck } from "@/features/health/api/health";
import { reportSerialEvent } from "@/features/notifications/api/notification-settings";
import { useCardScanner } from "@/features/scanner/api/use-card-scanner";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useSerial, useSerialMessage } from "@/features/scanner/api/use-serial";
import { useStation, useStations } from "@/features/scanner/api/use-stations";
import { BinLimitDialog } from "@/features/scanner/components/bin-limit-dialog";
import { PhoneCameraPairingDialog } from "@/features/scanner/components/phone-camera-pairing-dialog";
import { ScannerControls } from "@/features/scanner/components/scanner-controls";
import { ScannerMenu } from "@/features/scanner/components/scanner-menu";
import { ScannerOverlay } from "@/features/scanner/components/scanner-overlay";
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
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useOnnxRuntimeFailureToast } from "@/features/scanner/api/use-onnx-runtime-failure-toast";
import { useUnmatchedRateToast } from "@/features/scanner/api/use-unmatched-rate-toast";
import { useSupportPrompt } from "@/features/billing/api/use-support-prompt";
import { useNavigate } from "react-router-dom";
import { toast } from "@/lib/toast";

export function CardScanner({
  className,
  compact,
  controlsPosition = "bottom",
  controlsContainer,
}: CardScannerComponentProps) {
  const { t } = useTranslation("scanner");
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
    setScannerRunning,
  } = useScannedCards();
  const { station } = useStation();
  const {
    setActiveStation,
    connectAnotherSorter,
    canConnectAnotherSorter,
    sorterLimitIsHardCap,
  } = useStations();
  const {
    isConnected,
    isReady,
    firmwareVersion,
    disconnect,
    sendTest,
    sendCommand,
    receiveResponse,
  } = useSerial();
  const {
    connect,
    connectBluetooth,
    staleDialogOpen,
    onDismissStaleDialog,
    onRunTest,
    onCalibrateFirst,
  } = useConnectWithStaleCheck();
  const bluetoothSupported =
    typeof navigator !== "undefined" && !!navigator.bluetooth;
  const [isFeeding, setIsFeeding] = useState(false);
  const [isClearingDevice, setIsClearingDevice] = useState(false);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const { hasCatchAll } = useBinConfigs();
  const { activeCollection } = useCollections();
  const apiHealthCheck = useGameApiHealthCheck(activeCollection?.game?.key);
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
  const scanningBlocked = apiHealthCheck?.status === "error" || isAtScanLimit;

  useSerialMessage((msg) => {
    if (
      typeof msg === "object" &&
      msg !== null &&
      "error" in msg &&
      (msg as Record<string, unknown>).error === "jam"
    ) {
      if (!SESSION_TIMER_RUNNING_STATUSES.includes(status)) return;

      const raw = msg as Record<string, unknown>;

      pause();
      showJamToast({
        module: Number(raw.module),
        binNumber: raw.bin ? Number(raw.bin) : undefined,
      });
      void reportSerialEvent({
        command: "jam",
        sent: true,
        response: raw,
        collectionGuid: activeCollection?.guid,
      });
    }
  });

  // A card fed just before the tab was hidden still arrives; hold it until resume.
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
  }, [pause, t]);

  const handleFeed = useCallback(async () => {
    if (!isReady) return;
    setIsFeeding(true);
    try {
      const sent = await sendCommand(JSON.stringify({ feeder: true }));
      if (!sent) {
        toast.error(t("cardScanner.feedFailed.title"), {
          description: t("feederCommandFailedDescription"),
        });
        void reportSerialEvent({
          command: "feeder",
          sent: false,
          response: null,
          collectionGuid: activeCollection?.guid,
        });
        return;
      }
      const response = await receiveResponse(10000);
      if (!response) {
        toast.error(t("cardScanner.feedTimeout.title"), {
          description: t("feederTimeoutDescription"),
        });
        void reportSerialEvent({
          command: "feeder",
          sent: true,
          response: null,
          collectionGuid: activeCollection?.guid,
        });
        return;
      }
      try {
        const parsed = JSON.parse(response) as Record<string, unknown>;
        if (parsed.empty) {
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
        });
      }
    } finally {
      setIsFeeding(false);
    }
  }, [
    isReady,
    sendCommand,
    receiveResponse,
    handleCardArrived,
    handlePause,
    t,
    activeCollection?.guid,
  ]);

  const handleClearDevice = useCallback(async () => {
    if (!isReady) return;
    setIsClearingDevice(true);
    try {
      const sent = await sendCommand(JSON.stringify({ clearDevice: true }));
      if (!sent) {
        toast.error(t("cardScanner.clearFailed.title"), {
          description: t("cardScanner.clearFailed.description"),
        });
        return;
      }
      const response = await receiveResponse(10000);
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
  }, [isReady, sendCommand, receiveResponse, t]);

  const handleForceScanClick = useCallback(async () => {
    if (!isReady) {
      handleForceScan();
      return;
    }
    try {
      const sent = await sendCommand(JSON.stringify({ readIR: true }));
      if (sent) {
        const response = await receiveResponse(2000);
        if (response) {
          const parsed = JSON.parse(response) as Record<string, unknown>;
          if (Array.isArray(parsed.ir) && !parsed.ir[0]) {
            toast.error(t("cardScanner.noCardDetected.title"), {
              description: t("cardScanner.noCardDetected.description"),
            });
            return;
          }
        }
      }
    } catch {
      // Malformed/missing response - fall through to the scan attempt.
    }
    handleForceScan();
  }, [isReady, sendCommand, receiveResponse, handleForceScan, t]);

  useEffect(() => {
    return registerCardArrivedHook(handleCardArrived);
  }, [registerCardArrivedHook, handleCardArrived]);

  useEffect(() => {
    return registerPauseHook(handlePause);
  }, [registerPauseHook, handlePause]);

  const handleResumeScanning = useCallback(() => {
    clearFeedHalt();
    if (heldCardArrivalRef.current) {
      handleResumeClick();
      return;
    }
    handleResume();
    if (autoFeed) void handleFeed();
  }, [clearFeedHalt, handleResumeClick, handleResume, handleFeed, autoFeed]);

  useEffect(() => {
    return registerResumeHook(handleResumeScanning);
  }, [registerResumeHook, handleResumeScanning]);

  const handleContinueAfterBinLimit = useCallback(async () => {
    await resolveBinLimit();
    handleResumeScanning();
  }, [resolveBinLimit, handleResumeScanning]);

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
    />
  );

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
                className="w-48 aspect-square object-fill"
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
          firmwareVersion={firmwareVersion}
          hasCatchAll={hasCatchAll}
          autoFeed={autoFeed}
          cameraSource={cameraSource}
          phonePairingStatus={phonePairingStatus}
          hasPhonePhoto={hasPhonePhoto}
          apiHealthCheck={apiHealthCheck}
          dailyLimitReached={isAtScanLimit}
          onRetryError={handleRetryError}
          onConnectCamera={handleRetryError}
          onOpenPhonePairing={handleOpenPhonePairing}
          onConnectScanner={connect}
          onConnectScannerBluetooth={connectBluetooth}
          bluetoothSupported={bluetoothSupported}
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
          bluetoothSupported={bluetoothSupported}
          onScannerDisconnect={disconnect}
          onScannerRetry={sendTest}
          onCalibrate={() => {
            setActiveStation(station.id);
            navigate("/app/calibrate");
          }}
          onConnectAnotherUsb={() => connectAnotherSorter("usb")}
          onConnectAnotherBluetooth={() => connectAnotherSorter("bluetooth")}
          canConnectAnotherSorter={canConnectAnotherSorter}
          sorterLimitIsHardCap={sorterLimitIsHardCap}
          onUpgrade={() => navigate("/app/settings")}
          onAutoFeedChange={setAutoFeed}
          onAllowDuplicatesChange={setAllowDuplicates}
        />
      </div>
      {isCameraActive && !controlsContainer && scannerControls}
      {isCameraActive &&
        controlsContainer &&
        createPortal(scannerControls, controlsContainer)}
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
      <BinLimitDialog
        bin={binLimitReached}
        onContinue={handleContinueAfterBinLimit}
      />
      <StaleDeviceDialog
        open={staleDialogOpen}
        onOpenChange={(open) => {
          if (!open) onDismissStaleDialog();
        }}
        onRunTest={onRunTest}
        onCalibrateFirst={onCalibrateFirst}
      />
    </div>
  );
}
