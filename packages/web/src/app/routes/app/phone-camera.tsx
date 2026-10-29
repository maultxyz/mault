import { MobilePageHeader } from "@/components/mobile-page-header";
import { Button } from "@/components/ui/button";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { useDevice } from "@/features/calibration/api/use-device";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { usePhoneCameraResponder } from "@/features/scanner/api/use-phone-camera-responder";
import { usePhoneLocalCamera } from "@/features/scanner/api/use-phone-local-camera";
import { useVideoCanvasPreview } from "@/features/scanner/api/use-video-canvas-preview";
import { CAPTURE_FLASH_MS } from "@/lib/constants/timing";
import { cn } from "@/lib/utils";
import { DEFAULT_SCAN_REGION, type ScanRegion } from "@magic-vault/shared";
import {
  IconCameraRotate,
  IconCameraSpark,
  IconLoader2,
  IconPlugOff,
  IconRefresh,
  IconVideoOff,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

export default function PhoneCameraPage() {
  const { t } = useTranslation("scanner");
  const { collectionGuid } = useParams<{ collectionGuid: string }>();
  const {
    status,
    localStream,
    errorMessage,
    cameras,
    activeDeviceId,
    switchCamera,
    disconnect,
    reconnect,
  } = usePhoneLocalCamera();
  const { data: collections } = useQuery(collectionsQueryOptions);
  const collection = collections?.find((c) => c.guid === collectionGuid);
  const device = useDevice();
  const [liveScanRegion, setLiveScanRegion] = useState<ScanRegion | null>(null);
  const scanRegion =
    liveScanRegion ?? device?.scanRegion ?? DEFAULT_SCAN_REGION;
  const { videoRef, displayCanvasRef, overlayCanvasRef } =
    useVideoCanvasPreview(localStream, scanRegion);

  const [justCaptured, setJustCaptured] = useState(false);
  const handleCapture = useCallback(() => {
    setJustCaptured(true);
    setTimeout(() => setJustCaptured(false), CAPTURE_FLASH_MS);
  }, []);

  const [sessionEnded, setSessionEnded] = useState(false);
  const handleDesktopDisconnected = useCallback(() => {
    setSessionEnded(true);
  }, []);

  usePhoneCameraResponder(
    collectionGuid,
    displayCanvasRef,
    status === "ready",
    handleCapture,
    handleDesktopDisconnected,
    setLiveScanRegion,
  );

  const statusText: Record<typeof status, string> = {
    "requesting-camera": t("requestingCameraAccess"),
    "camera-error": t("cameraAccessError"),
    ready: t("phoneCamera.ready"),
    disconnected: t("phoneCamera.disconnected"),
  };

  const sessionEndedDialog = (
    <DynamicDialog
      open={sessionEnded}
      onOpenChange={setSessionEnded}
      title={t("phoneCamera.sessionEndedTitle")}
      description={t("phoneCamera.sessionEndedDescription")}
      footer={
        <Button
          variant="outline-destructive"
          onClick={() => {
            setSessionEnded(false);
            disconnect();
          }}
        >
          {t("disconnect")}
        </Button>
      }
    />
  );

  const activeCameraIndex = Math.max(
    0,
    cameras.findIndex((camera) => camera.deviceId === activeDeviceId),
  );
  const activeCamera = cameras[activeCameraIndex];
  const activeCameraLabel =
    activeCamera?.label ||
    t("phoneCamera.cameraFallbackLabel", { number: activeCameraIndex + 1 });
  const handleSwitchCamera = () => {
    const next = cameras[(activeCameraIndex + 1) % cameras.length];
    if (next && next.deviceId !== activeDeviceId) switchCamera(next.deviceId);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MobilePageHeader
        title={t("usePhoneAsCamera")}
        subtitle={
          collection
            ? t("phoneCamera.streamingTo", { name: collection.name })
            : undefined
        }
      />
      <div className="flex min-h-0 w-full flex-1 flex-col gap-3 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl bg-black">
          {status === "disconnected" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-white">
              <IconPlugOff className="size-8 text-white/70" />
              <p className="text-sm font-medium">{statusText.disconnected}</p>
              <Button variant="secondary" onClick={reconnect}>
                <IconRefresh />
                {t("reconnect")}
              </Button>
            </div>
          ) : (
            <>
              <video ref={videoRef} className="hidden" playsInline muted />
              <canvas ref={displayCanvasRef} className="absolute" />
              <canvas
                ref={overlayCanvasRef}
                className="pointer-events-none absolute z-10"
              />
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 z-20 bg-white transition-opacity duration-300 motion-reduce:transition-none",
                  justCaptured ? "opacity-70" : "opacity-0",
                )}
              />
              <div className="absolute inset-x-0 bottom-4 z-30 flex flex-col items-center gap-2 px-4">
                {status === "camera-error" && errorMessage && (
                  <p className="rounded-lg bg-black/70 px-3 py-1.5 text-center text-sm text-white/80 backdrop-blur-sm">
                    {errorMessage}
                  </p>
                )}
                <div className="flex items-center gap-2 rounded-full bg-black/70 px-3.5 py-2 text-sm text-white shadow-lg backdrop-blur-sm">
                  {status === "ready" ? (
                    <IconCameraSpark className="size-4 shrink-0 text-success" />
                  ) : status === "camera-error" ? (
                    <IconVideoOff className="size-4 shrink-0 text-destructive" />
                  ) : (
                    <IconLoader2 className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
                  )}
                  <span>{statusText[status]}</span>
                </div>
              </div>
            </>
          )}
        </div>
        {status !== "disconnected" && (
          <div className="flex items-stretch gap-1.5">
            {cameras.length > 1 && (
              <Button
                size="lg"
                className="h-12 min-w-0 flex-1 text-sm"
                onClick={handleSwitchCamera}
              >
                <IconCameraRotate />
                <span className="flex min-w-0 flex-col items-start leading-tight">
                  <span>{t("phoneCamera.switchCamera")}</span>
                  <span className="max-w-full truncate text-xs font-normal opacity-80">
                    {activeCameraLabel}
                  </span>
                </span>
              </Button>
            )}
            <Button
              variant="outline"
              size="lg"
              className={cn("h-12 text-sm", cameras.length <= 1 && "flex-1")}
              onClick={disconnect}
            >
              <IconPlugOff />
              {t("disconnect")}
            </Button>
          </div>
        )}
      </div>
      {sessionEndedDialog}
    </div>
  );
}
