import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { useCameraFrameCanvas } from "@/features/calibration/api/use-camera-frame-canvas";
import { useCameraContext } from "@/features/scanner/api/use-camera";
import { PhoneCameraPairingDialog } from "@/features/scanner/components/phone-camera-pairing-dialog";
import { drawDetectionOverlay } from "@/features/scanner/lib/card-detection";
import { detectCardCorners } from "@/features/scanner/lib/cornelius";
import {
  CAPTURE_SETTLE_DELAY_SLIDER_MAX,
  MATCHES_NEEDED_MIN,
  MATCHES_NEEDED_SLIDER_MAX,
  sliderMax,
} from "@/lib/constants/calibration";
import type { ScanRegion } from "@magic-vault/shared";
import { IconCameraSpark, IconDeviceMobile } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const LIVE_DETECTION_INTERVAL_MS = 200;

interface ScanRegionCalibrationPanelProps {
  scanRegion: ScanRegion;
  captureSettleDelayMs: number;
  matchesNeeded: number;
  isLoading: boolean;
  onRegionChange: (region: ScanRegion) => void;
  onResetRegion: () => void;
  onCaptureSettleChange: (value: number) => void;
  onMatchesNeededChange: (value: number) => void;
}

export function ScanRegionCalibrationPanel({
  captureSettleDelayMs: captureSettleDelayMsValue,
  matchesNeeded,
  isLoading,
  onCaptureSettleChange,
  onMatchesNeededChange,
}: ScanRegionCalibrationPanelProps) {
  const { t } = useTranslation("calibration");

  const {
    stream,
    status: cameraStatus,
    errorMessage,
    retryCamera,
    cameraSource,
    phonePairingStatus,
    phonePairingUrl,
    startPhonePairing,
    stopPhonePairing,
    requestPhoneCapture,
  } = useCameraContext();
  const isCameraActive = cameraSource === "local" && cameraStatus === "ready";
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectCamera = async () => {
    setIsConnecting(true);
    try {
      await retryCamera();
    } finally {
      setIsConnecting(false);
    }
  };

  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [phonePhotoUrl, setPhonePhotoUrl] = useState<string | null>(null);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [phoneCaptureError, setPhoneCaptureError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (cameraSource !== "phone") {
      setPhonePhotoUrl(null);
      setPhoneCaptureError(null);
    }
  }, [cameraSource]);

  const handleOpenPhonePairing = () => {
    setPhoneDialogOpen(true);
    if (phonePairingStatus === "idle" || phonePairingStatus === "error")
      startPhonePairing();
  };

  const handlePhoneDialogOpenChange = (open: boolean) => {
    setPhoneDialogOpen(open);
    if (!open && phonePairingStatus !== "connected") stopPhonePairing();
  };

  const handleDisconnectPhone = () => {
    stopPhonePairing();
    setPhoneDialogOpen(false);
  };

  const handleTakePhoto = async () => {
    setIsCapturingPhoto(true);
    setPhoneCaptureError(null);
    try {
      const dataUrl = await requestPhoneCapture();
      if (dataUrl) {
        setPhonePhotoUrl(dataUrl);
      } else {
        setPhoneCaptureError(
          t("scanRegionCalibrationPanel.phoneCaptureFailed"),
        );
      }
    } finally {
      setIsCapturingPhoto(false);
    }
  };

  const { videoRef, frameRef, canvasRef, videoSize, phonePhotoSize } =
    useCameraFrameCanvas({ stream, phonePhotoUrl });
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const liveDetectingRef = useRef(false);
  useEffect(() => {
    if (!videoSize) return;

    const interval = setInterval(() => {
      if (liveDetectingRef.current) return;
      const canvas = canvasRef.current;
      const overlayCanvas = overlayCanvasRef.current;
      const overlayCtx = overlayCanvas?.getContext("2d");
      if (!canvas || !overlayCanvas || !overlayCtx) return;
      if (overlayCanvas.width !== canvas.width) overlayCanvas.width = canvas.width;
      if (overlayCanvas.height !== canvas.height) overlayCanvas.height = canvas.height;

      liveDetectingRef.current = true;
      detectCardCorners(canvas)
        .then((detection) => {
          overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
          if (detection.cardPresent) {
            drawDetectionOverlay(overlayCtx, {
              detected: true,
              contour: detection.contour,
              confidence: detection.confidence,
              sharpness: detection.sharpness ?? undefined,
            });
          }
        })
        .catch((err) => console.error("[calibration] live detection failed:", err))
        .finally(() => {
          liveDetectingRef.current = false;
        });
    }, LIVE_DETECTION_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [videoSize, canvasRef]);

  useEffect(() => {
    if (!phonePhotoSize) return;
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const overlayCtx = overlayCanvas?.getContext("2d");
    if (!canvas || !overlayCanvas || !overlayCtx) return;
    overlayCanvas.width = canvas.width;
    overlayCanvas.height = canvas.height;

    detectCardCorners(canvas)
      .then((detection) => {
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        if (detection.cardPresent) {
          drawDetectionOverlay(overlayCtx, {
            detected: true,
            contour: detection.contour,
            confidence: detection.confidence,
            sharpness: detection.sharpness ?? undefined,
          });
        }
      })
      .catch((err) => console.error("[calibration] photo detection failed:", err));
  }, [phonePhotoSize, canvasRef]);

  return (
    <div className="flex flex-col gap-2" data-tour="scan-region-panel">
      <p className="text-xs text-muted-foreground">
        {t("scanRegionCalibrationPanel.instructions")}
      </p>

      <div className="flex flex-col gap-2 w-full max-w-sm mx-auto md:mx-0">
        <PhoneCameraPairingDialog
          open={phoneDialogOpen}
          onOpenChange={handlePhoneDialogOpenChange}
          status={phonePairingStatus}
          pairingUrl={phonePairingUrl}
          onRetry={startPhonePairing}
          onDisconnect={handleDisconnectPhone}
        />

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleConnectCamera}
            disabled={isConnecting}
            className="flex-1"
          >
            <IconCameraSpark />
            {isConnecting
              ? t("scanRegionCalibrationPanel.connecting")
              : isCameraActive
                ? t("scanRegionCalibrationPanel.reconnectWebcam")
                : t("scanRegionCalibrationPanel.connectWebcam")}
          </Button>
          <Button
            variant="outline"
            onClick={handleOpenPhonePairing}
            className="flex-1"
          >
            <IconDeviceMobile />
            {cameraSource === "phone" && phonePairingStatus === "connected"
              ? t("scanRegionCalibrationPanel.phoneCameraConnected")
              : t("scanRegionCalibrationPanel.usePhoneAsCamera")}
          </Button>
        </div>

        {cameraSource === "phone" && (
          <Button
            variant="outline"
            onClick={handleTakePhoto}
            disabled={phonePairingStatus !== "connected" || isCapturingPhoto}
            className="w-full"
          >
            <IconCameraSpark />
            {isCapturingPhoto
              ? t("scanRegionCalibrationPanel.capturingPhoto")
              : phonePhotoUrl
                ? t("scanRegionCalibrationPanel.retakePhoto")
                : t("scanRegionCalibrationPanel.takePhoto")}
          </Button>
        )}
        {phoneCaptureError && (
          <p className="text-sm text-destructive">{phoneCaptureError}</p>
        )}

        <div className="relative overflow-hidden bg-background w-full rounded-lg border aspect-[2.5/3.5]">
          <video ref={videoRef} className="hidden" playsInline muted />
          <div ref={frameRef} className="absolute">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
            />
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
          </div>
          {cameraSource === "phone"
            ? !phonePhotoUrl && (
                <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    {phonePairingStatus === "connected"
                      ? t("scanRegionCalibrationPanel.takePhotoPrompt")
                      : t("scanRegionCalibrationPanel.waitingForPhone")}
                  </p>
                </div>
              )
            : !isCameraActive && (
                <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    {errorMessage ||
                      t("scanRegionCalibrationPanel.waitingForCamera")}
                  </p>
                </div>
              )}
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {t("scanRegionCalibrationPanel.captureSettleLabel")}
            </p>
            {isLoading ? (
              <Skeleton className="h-5 w-12 rounded" />
            ) : (
              <span className="text-sm font-bold">
                {t("msValue", { value: captureSettleDelayMsValue })}
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/70">
            {t("scanRegionCalibrationPanel.captureSettleDescription")}
          </p>
          <Slider
            min={0}
            max={sliderMax(
              captureSettleDelayMsValue,
              CAPTURE_SETTLE_DELAY_SLIDER_MAX,
            )}
            step={10}
            value={captureSettleDelayMsValue}
            onValueChange={onCaptureSettleChange}
          />
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {t("scanRegionCalibrationPanel.matchesNeededLabel")}
            </p>
            {isLoading ? (
              <Skeleton className="h-5 w-6 rounded" />
            ) : (
              <span className="text-sm font-bold">{matchesNeeded}</span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/70">
            {t("scanRegionCalibrationPanel.matchesNeededDescription")}
          </p>
          <Slider
            min={MATCHES_NEEDED_MIN}
            max={sliderMax(matchesNeeded, MATCHES_NEEDED_SLIDER_MAX)}
            step={1}
            value={matchesNeeded}
            onValueChange={onMatchesNeededChange}
          />
        </div>
      </div>
    </div>
  );
}
