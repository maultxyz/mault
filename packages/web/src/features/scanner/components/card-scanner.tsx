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
import { useRegisterScannerIsland } from "@/features/scanner/api/use-scanner-island";
import { useSerial, useSerialMessage } from "@/features/scanner/api/use-serial";
import { ScannerMenu } from "@/features/scanner/components/scanner-menu";
import { ScannerOverlay } from "@/features/scanner/components/scanner-overlay";
import { SCANNABLE_STATUSES } from "@/features/scanner/constants";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/utils";
import type { CardScannerProps } from "@magic-vault/shared";
import { IconEye } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function CardScanner({ className, compact }: CardScannerProps) {
  const { t } = useTranslation("scanner");
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const isMobile = useIsMobile();
  const {
    addCard,
    sendCatchAllBin,
    autoFeed,
    setAutoFeed,
    registerCardArrivedHook,
    registerPauseHook,
  } = useScannedCards();
  const registerIsland = useRegisterScannerIsland();
  const {
    isConnected,
    isReady,
    firmwareVersion,
    connect,
    disconnect,
    sendTest,
    sendCommand,
    receiveResponse,
  } = useSerial();
  const [isFeeding, setIsFeeding] = useState(false);
  const [isClearingDevice, setIsClearingDevice] = useState(false);
  const { hasCatchAll } = useBinConfigs();
  const { activeCollection } = useCollections();
  const apiHealthCheck = useGameApiHealthCheck(activeCollection?.game?.key);
  const scanningBlocked = apiHealthCheck?.status === "error";
  const {
    status,
    errorMessage,
    isCameraActive,
    debugImageUrl,
    videoRef,
    displayCanvasRef,
    overlayCanvasRef,
    captureCard,
    handleForceAddDuplicate,
    handleForceScan,
    handleSkipDuplicate: handleSkipDuplicateFromScanner,
    handlePause,
    handleResume,
    handleRetryError,
    handleStopCamera,
    zoom,
    zoomRange,
    cameras,
    selectedCameraId,
    setZoom,
    selectCamera,
    allowDuplicates,
    setAllowDuplicates,
    cameraSource,
    phonePairingStatus,
    phonePairingUrl,
    startPhonePairing,
    stopPhonePairing,
    hasPhonePhoto,
  } = useCardScanner({
    onSearchResults: (cards, capturedImageUrl) => {
      if (cards.length > 0) {
        addCard(cards[0], capturedImageUrl, cards.slice(1));
      }
    },
    onNoMatch: sendCatchAllBin,
    rotated: !isMobile,
  });

  useSerialMessage((msg) => {
    if (
      typeof msg === "object" &&
      msg !== null &&
      "error" in msg &&
      (msg as Record<string, unknown>).error === "jam"
    ) {
      const raw = msg as Record<string, unknown>;

      if (
        raw.module === 1 &&
        raw.bin === undefined &&
        SCANNABLE_STATUSES.includes(status)
      ) {
        toast.info(t("cardScanner.jamAutoScan.title"), {
          description: t("cardScanner.jamAutoScan.description"),
        });
        handleForceScan();
        return;
      }

      handlePause();
      toast.error(t("cardScanner.jamDetected.title"), {
        description: raw.bin
          ? t("cardScanner.jamDetected.descriptionWithBin", {
              module: raw.module,
              bin: raw.bin,
            })
          : t("cardScanner.jamDetected.description", { module: raw.module }),
        duration: Infinity,
        dismissible: true,
      });
      void reportSerialEvent({ command: "jam", sent: true, response: raw });
    }
  });

  const handleFeed = useCallback(async () => {
    setIsFeeding(true);
    try {
      const sent = await sendCommand(JSON.stringify({ feeder: true }));
      if (!sent) {
        toast.error(t("cardScanner.feedFailed.title"), {
          description: t("cardScanner.feedFailed.description"),
        });
        void reportSerialEvent({
          command: "feeder",
          sent: false,
          response: null,
        });
        return;
      }
      const response = await receiveResponse(10000);
      if (!response) {
        toast.error(t("cardScanner.feedTimeout.title"), {
          description: t("cardScanner.feedTimeout.description"),
        });
        void reportSerialEvent({
          command: "feeder",
          sent: true,
          response: null,
        });
        return;
      }
      try {
        const parsed = JSON.parse(response) as Record<string, unknown>;
        if (parsed.empty) {
          handlePause();
          toast.error(t("cardScanner.feederEmpty.title"), {
            description: t("cardScanner.feederEmpty.description"),
            duration: Infinity,
            dismissible: true,
          });
          void reportSerialEvent({
            command: "feeder",
            sent: true,
            response: parsed,
          });
        } else if (parsed.error) {
          toast.error(t("cardScanner.feederError.title"), {
            description: String(parsed.error),
            duration: Infinity,
            dismissible: true,
          });
          void reportSerialEvent({
            command: "feeder",
            sent: true,
            response: parsed,
          });
        } else {
          // Feeder confirmed a card reached module 1 - capture it now.
          captureCard();
        }
      } catch {
        toast.error(t("cardScanner.feedError.title"), {
          description: t("cardScanner.feedError.description"),
        });
        void reportSerialEvent({ command: "feeder", sent: true, response });
      }
    } finally {
      setIsFeeding(false);
    }
  }, [sendCommand, receiveResponse, captureCard, handlePause, t]);

  const handleClearDevice = useCallback(async () => {
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
  }, [sendCommand, receiveResponse, t]);

  const handleSkipDuplicate = useCallback(() => {
    sendCatchAllBin();
    handleSkipDuplicateFromScanner();
  }, [sendCatchAllBin, handleSkipDuplicateFromScanner]);

  useEffect(() => {
    return registerCardArrivedHook(captureCard);
  }, [registerCardArrivedHook, captureCard]);

  useEffect(() => {
    return registerPauseHook(handlePause);
  }, [registerPauseHook, handlePause]);

  useEffect(() => {
    registerIsland({
      status,
      isCameraActive,
      isConnected,
      isReady,
      isFeeding,
      isClearingDevice,
      handleForceAddDuplicate,
      handleForceScan,
      handleSkipDuplicate,
      handlePause: () => {
        setAutoFeed(false);
        handlePause();
      },
      handleResume,
      handleFeed,
      handleClearDevice,
    });
  }, [
    status,
    isCameraActive,
    isConnected,
    isReady,
    isFeeding,
    isClearingDevice,
    handleForceAddDuplicate,
    handleForceScan,
    handleSkipDuplicate,
    handlePause,
    handleResume,
    handleFeed,
    handleClearDevice,
    setAutoFeed,
    registerIsland,
  ]);

  useEffect(() => () => registerIsland(null), [registerIsland]);

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

  return (
    <div
      className={cn(
        "flex flex-col-reverse md:flex-col overflow-hidden gap-2",
        className,
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-background w-full h-full max-w-full rounded-lg border",
          !compact && "md:aspect-[2.5/3.5]",
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
                className="w-48"
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
          onRetryError={handleRetryError}
          onConnectScanner={connect}
        />
        <ScannerMenu
          isCameraActive={isCameraActive}
          isConnected={isConnected}
          autoFeed={autoFeed}
          allowDuplicates={allowDuplicates}
          zoom={zoom}
          zoomRange={zoomRange}
          cameras={cameras}
          selectedCameraId={selectedCameraId}
          phonePairingStatus={phonePairingStatus}
          phonePairingUrl={phonePairingUrl}
          scanningBlocked={scanningBlocked}
          onCameraConnect={handleRetryError}
          onCameraDisconnect={handleStopCamera}
          onCameraSelect={selectCamera}
          onZoomChange={setZoom}
          onStartPhonePairing={startPhonePairing}
          onStopPhonePairing={stopPhonePairing}
          onScannerConnect={connect}
          onScannerDisconnect={disconnect}
          onScannerRetry={sendTest}
          onCalibrate={() => navigate("/app/calibrate")}
          onAutoFeedChange={setAutoFeed}
          onAllowDuplicatesChange={setAllowDuplicates}
        />
      </div>
    </div>
  );
}
