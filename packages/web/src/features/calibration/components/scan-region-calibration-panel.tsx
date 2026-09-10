import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useCameraFrameCanvas } from "@/features/calibration/api/use-camera-frame-canvas";
import { useRegionDrag } from "@/features/calibration/api/use-region-drag";
import {
  contourToBox,
  rawContourToPortraitBox,
} from "@/features/calibration/lib/scan-region-geometry";
import {
  orgSettingsQueryOptions,
  saveOrgSettings,
} from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { useCameraContext } from "@/features/scanner/api/use-camera";
import { PhoneCameraPairingDialog } from "@/features/scanner/components/phone-camera-pairing-dialog";
import { getDefaultCardContour } from "@/features/scanner/lib/card-detection";
import { SCAN_REGION_PHONE_SYNC_DELAY_MS } from "@/lib/constants/timing";
import {
  DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  DEFAULT_SCAN_REGION,
  type ScanRegion,
} from "@magic-vault/shared";
import {
  IconCameraSpark,
  IconDeviceMobile,
  IconRotate,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export function ScanRegionCalibrationPanel() {
  const { t } = useTranslation("calibration");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const queryOpts = orgSettingsQueryOptions(activeOrg?.id);
  const { data, isLoading } = useQuery(queryOpts);
  const savedRegion = data?.scanRegion ?? DEFAULT_SCAN_REGION;
  const savedCaptureSettleDelayMs =
    data?.captureSettleDelayMs ?? DEFAULT_CAPTURE_SETTLE_DELAY_MS;

  const [draft, setDraft] = useState<ScanRegion | null>(null);
  const region = draft ?? savedRegion;
  const regionRef = useRef(region);
  regionRef.current = region;

  const [captureSettleDraft, setCaptureSettleDraft] = useState<number | null>(
    null,
  );
  const captureSettleDelayMsValue =
    captureSettleDraft ?? savedCaptureSettleDelayMs;

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
    sendPhoneScanRegion,
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

  useEffect(() => {
    if (cameraSource !== "phone" || phonePairingStatus !== "connected") return;
    const timeout = setTimeout(
      () => sendPhoneScanRegion(region),
      SCAN_REGION_PHONE_SYNC_DELAY_MS,
    );
    return () => clearTimeout(timeout);
  }, [region, cameraSource, phonePairingStatus, sendPhoneScanRegion]);

  const box =
    cameraSource === "phone"
      ? phonePhotoSize
        ? contourToBox(
            getDefaultCardContour(
              phonePhotoSize.width,
              phonePhotoSize.height,
              region,
            ),
            phonePhotoSize.width,
            phonePhotoSize.height,
          )
        : null
      : videoSize
        ? rawContourToPortraitBox(
            getDefaultCardContour(videoSize.width, videoSize.height, region),
            videoSize.width,
            videoSize.height,
          )
        : null;

  const {
    handleBoxPointerDown,
    handleResizePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useRegionDrag({ frameRef, regionRef, cameraSource, box, setDraft });

  const saveMutation = useMutation({
    mutationFn: (next: ScanRegion) => saveOrgSettings({ scanRegion: next }),
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.setQueryData(queryOpts.queryKey, result.data);
        setDraft(null);
      }
    },
  });

  const saveCaptureSettleMutation = useMutation({
    mutationFn: (next: number) =>
      saveOrgSettings({ captureSettleDelayMs: next }),
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.setQueryData(queryOpts.queryKey, result.data);
        setCaptureSettleDraft(null);
      }
    },
  });

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
            {box && (
              <div
                className="absolute rounded-xl border-[6px] border-primary! cursor-move touch-none select-none"
                style={{
                  left: `${box.left * 100}%`,
                  top: `${box.top * 100}%`,
                  width: `${box.width * 100}%`,
                  height: `${box.height * 100}%`,
                }}
                onPointerDown={handleBoxPointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                <div
                  className="absolute -right-2.5 -bottom-2.5 size-5 rounded-full bg-primary border-2 border-background cursor-nwse-resize touch-none"
                  onPointerDown={handleResizePointerDown}
                />
              </div>
            )}
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

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDraft({ ...DEFAULT_SCAN_REGION })}
            title={t("scanRegionCalibrationPanel.resetToDefault")}
          >
            <IconRotate size={14} />
            <span className="sr-only">
              {t("scanRegionCalibrationPanel.resetToDefault")}
            </span>
          </Button>
          <Button
            disabled={draft === null || saveMutation.isPending}
            onClick={() => saveMutation.mutate(region)}
            className="flex-1"
          >
            {saveMutation.isPending
              ? t("scanRegionCalibrationPanel.saving")
              : t("scanRegionCalibrationPanel.saveScanRegion")}
          </Button>
        </div>
        {isLoading ? (
          <Skeleton className="h-3 w-40 rounded" />
        ) : (
          <p className="text-xs text-muted-foreground">
            {t("scanRegionCalibrationPanel.savedSummary", {
              coverage: Math.round(savedRegion.coverage * 100),
              offsetX: Math.round(savedRegion.offsetX * 100),
              offsetY: Math.round(savedRegion.offsetY * 100),
            })}
          </p>
        )}

        <div className="flex flex-col gap-2 pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {t("scanRegionCalibrationPanel.captureSettleLabel")}
          </p>
          <p className="text-[10px] text-muted-foreground/70">
            {t("scanRegionCalibrationPanel.captureSettleDescription")}
          </p>
          <ButtonGroup className="w-full">
            <Button
              variant="outline"
              disabled={captureSettleDelayMsValue <= 0}
              onClick={() =>
                setCaptureSettleDraft(
                  Math.max(0, captureSettleDelayMsValue - 100),
                )
              }
              className="px-2 text-xs"
            >
              -100
            </Button>
            <Button
              variant="outline"
              disabled={captureSettleDelayMsValue <= 0}
              onClick={() =>
                setCaptureSettleDraft(
                  Math.max(0, captureSettleDelayMsValue - 10),
                )
              }
              className="px-2 text-xs"
            >
              -10
            </Button>
            <div className="flex flex-row flex-1 bg-background border-y justify-center px-2 items-center">
              <p className="font-bold text-sm">
                {t("scanRegionCalibrationPanel.msValue", {
                  value: captureSettleDelayMsValue,
                })}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() =>
                setCaptureSettleDraft(captureSettleDelayMsValue + 10)
              }
              className="px-2 text-xs"
            >
              +10
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setCaptureSettleDraft(captureSettleDelayMsValue + 100)
              }
              className="px-2 text-xs"
            >
              +100
            </Button>
          </ButtonGroup>
          <Button
            disabled={
              captureSettleDraft === null || saveCaptureSettleMutation.isPending
            }
            onClick={() =>
              saveCaptureSettleMutation.mutate(captureSettleDelayMsValue)
            }
          >
            {saveCaptureSettleMutation.isPending
              ? t("scanRegionCalibrationPanel.saving")
              : t("scanRegionCalibrationPanel.setCaptureSettle")}
          </Button>
        </div>
      </div>
    </div>
  );
}
