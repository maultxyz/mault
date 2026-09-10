import { useCameraSignalChannel } from "@/features/scanner/api/use-camera-signal-channel";
import { PHONE_CAMERA_JPEG_QUALITY as JPEG_QUALITY } from "@/lib/constants/scanner";
import { HEARTBEAT_INTERVAL_MS } from "@/lib/constants/timing";
import type { PhoneCameraMessage, ScanRegion } from "@magic-vault/shared";
import { useCallback, useEffect, useRef } from "react";

export function usePhoneCameraResponder(
  collectionGuid: string | undefined,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  isCameraReady: boolean,
  onCapture?: () => void,
  onDesktopDisconnected?: () => void,
  onScanRegionUpdate?: (region: ScanRegion) => void,
) {
  const sendRef = useRef<(message: PhoneCameraMessage) => void>(() => {});
  const onCaptureRef = useRef(onCapture);
  onCaptureRef.current = onCapture;
  const onDesktopDisconnectedRef = useRef(onDesktopDisconnected);
  onDesktopDisconnectedRef.current = onDesktopDisconnected;
  const onScanRegionUpdateRef = useRef(onScanRegionUpdate);
  onScanRegionUpdateRef.current = onScanRegionUpdate;

  const handleMessage = useCallback(
    (message: PhoneCameraMessage) => {
      if (message.kind === "desktop_disconnected") {
        onDesktopDisconnectedRef.current?.();
        return;
      }
      if (message.kind === "scan_region_updated") {
        if (message.scanRegion) onScanRegionUpdateRef.current?.(message.scanRegion);
        return;
      }
      if (message.kind !== "capture_requested" || !message.requestId) return;
      const canvas = canvasRef.current;
      if (!canvas || !canvas.width || !canvas.height) return;
      const imageDataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
      sendRef.current({
        kind: "capture_response",
        requestId: message.requestId,
        imageDataUrl,
      });
      onCaptureRef.current?.();
    },
    [canvasRef],
  );

  const { send } = useCameraSignalChannel(collectionGuid, handleMessage);
  sendRef.current = send;

  useEffect(() => {
    if (!isCameraReady) return;
    send({ kind: "camera_ready" });
    const interval = setInterval(
      () => send({ kind: "camera_ready" }),
      HEARTBEAT_INTERVAL_MS,
    );
    return () => {
      clearInterval(interval);
      send({ kind: "camera_left" });
    };
  }, [isCameraReady, send]);
}
