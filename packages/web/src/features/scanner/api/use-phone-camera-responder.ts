import { uploadPhoneCameraCapture } from "@/features/collections/api/phone-camera-signal";
import { useCameraSignalChannel } from "@/features/scanner/api/use-camera-signal-channel";
import { canvasToBlob } from "@/features/scanner/lib/card-detection";
import { detectCardCorners } from "@/features/scanner/lib/cornelius";
import { PHONE_CAMERA_JPEG_QUALITY as JPEG_QUALITY } from "@/lib/constants/scanner";
import { HEARTBEAT_INTERVAL_MS } from "@/lib/constants/timing";
import {
  waitUntilCardSettles,
  type PhoneCameraCardObservation,
  type PhoneCameraMessage,
  type ScanRegion,
} from "@magic-vault/shared";
import { useCallback, useEffect, useRef } from "react";

async function observeCardOnCanvas(
  canvas: HTMLCanvasElement,
): Promise<PhoneCameraCardObservation | null> {
  if (!canvas.width || !canvas.height) return null;
  const detection = await detectCardCorners(canvas);
  return {
    cardPresent: detection.cardPresent,
    contour: detection.contour,
    frameLongSidePx: Math.max(canvas.width, canvas.height),
  };
}

export function usePhoneCameraResponder(
  collectionGuid: string | undefined,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  isCameraReady: boolean,
  onCapture?: () => void,
  onDesktopDisconnected?: () => void,
  onScanRegionUpdate?: (region: ScanRegion) => void,
) {
  const onCaptureRef = useRef(onCapture);
  onCaptureRef.current = onCapture;
  const onDesktopDisconnectedRef = useRef(onDesktopDisconnected);
  onDesktopDisconnectedRef.current = onDesktopDisconnected;
  const onScanRegionUpdateRef = useRef(onScanRegionUpdate);
  onScanRegionUpdateRef.current = onScanRegionUpdate;
  const latestRequestIdRef = useRef<string | null>(null);

  const respondToCapture = useCallback(
    async (requestId: string, maxCardSettleWaitMs: number) => {
      if (!collectionGuid) return;
      latestRequestIdRef.current = requestId;
      const isSuperseded = () => latestRequestIdRef.current !== requestId;
      if (maxCardSettleWaitMs > 0) {
        await waitUntilCardSettles({
          observeCard: () => {
            const canvas = canvasRef.current;
            return canvas ? observeCardOnCanvas(canvas) : Promise.resolve(null);
          },
          maxWaitMs: maxCardSettleWaitMs,
          isCancelled: isSuperseded,
        });
        if (isSuperseded()) return;
      }
      const canvas = canvasRef.current;
      if (!canvas || !canvas.width || !canvas.height) return;
      const image = await canvasToBlob(canvas, JPEG_QUALITY);
      onCaptureRef.current?.();
      await uploadPhoneCameraCapture(collectionGuid, requestId, image);
    },
    [collectionGuid, canvasRef],
  );

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
      respondToCapture(
        message.requestId,
        message.maxCardSettleWaitMs ?? 0,
      ).catch(() => {});
    },
    [respondToCapture],
  );

  const { send } = useCameraSignalChannel(collectionGuid, handleMessage);

  useEffect(() => {
    if (!isCameraReady) return;
    const canvas = canvasRef.current;
    if (canvas) observeCardOnCanvas(canvas).catch(() => {});
    const announceReady = () =>
      send({ kind: "camera_ready", capturesWhenCardSettles: true });
    announceReady();
    const interval = setInterval(announceReady, HEARTBEAT_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      send({ kind: "camera_left" });
    };
  }, [isCameraReady, send, canvasRef]);
}
