import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import { Images, type Image, type PixelFormat } from "react-native-nitro-image";
import { type CameraRef, type Frame, useFrameOutput } from "react-native-vision-camera";
import { createSynchronizable, scheduleOnRN } from "react-native-worklets";
import { LIVE_FRAME_TARGET_RESOLUTION, LIVE_FRAME_TIMEOUT_MS } from "@/lib/constants/scanner";
import type { LiveFrameSource } from "@/lib/interfaces/scanner";

interface PendingLiveFrame {
  resolve: (image: Image) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

function tightlyPackedPixels(buffer: ArrayBuffer, width: number, height: number, bytesPerRow: number): ArrayBuffer {
  const tightBytesPerRow = width * 4;
  if (bytesPerRow === tightBytesPerRow) return buffer;
  const source = new Uint8Array(buffer);
  const packed = new Uint8Array(tightBytesPerRow * height);
  for (let row = 0; row < height; row++) {
    packed.set(source.subarray(row * bytesPerRow, row * bytesPerRow + tightBytesPerRow), row * tightBytesPerRow);
  }
  return packed.buffer;
}

export function useLiveFrameSource(_cameraRef: RefObject<CameraRef | null>): LiveFrameSource {
  const liveFrameRequested = useMemo(() => createSynchronizable(false, { fixedType: true }), []);
  const pendingLiveFrameRef = useRef<PendingLiveFrame | null>(null);

  const settlePendingLiveFrame = useCallback(() => {
    const pending = pendingLiveFrameRef.current;
    pendingLiveFrameRef.current = null;
    if (pending) clearTimeout(pending.timeout);
    return pending;
  }, []);

  const deliverLiveFrame = useCallback(
    (buffer: ArrayBuffer, width: number, height: number, bytesPerRow: number, pixelFormat: PixelFormat) => {
      const pending = settlePendingLiveFrame();
      if (!pending) return;
      Images.loadFromRawPixelDataAsync({
        buffer: tightlyPackedPixels(buffer, width, height, bytesPerRow),
        width,
        height,
        pixelFormat,
      }).then(pending.resolve, pending.reject);
    },
    [settlePendingLiveFrame],
  );

  const failLiveFrame = useCallback(
    (reason: string) => settlePendingLiveFrame()?.reject(new Error(reason)),
    [settlePendingLiveFrame],
  );

  const onFrame = useCallback(
    (frame: Frame) => {
      "worklet";
      if (liveFrameRequested.getDirty()) {
        liveFrameRequested.setDirty(false);
        const pixelFormat =
          frame.pixelFormat === "rgb-bgra-8-bit" ? "BGRA" : frame.pixelFormat === "rgb-rgba-8-bit" ? "RGBA" : null;
        if (pixelFormat && frame.hasPixelBuffer) {
          scheduleOnRN(
            deliverLiveFrame,
            frame.getPixelBuffer().slice(0),
            frame.width,
            frame.height,
            frame.bytesPerRow,
            pixelFormat,
          );
        } else {
          scheduleOnRN(failLiveFrame, `Unsupported live frame format ${frame.pixelFormat}`);
        }
      }
      frame.dispose();
    },
    [liveFrameRequested, deliverLiveFrame, failLiveFrame],
  );

  const liveFrameOutput = useFrameOutput({
    targetResolution: LIVE_FRAME_TARGET_RESOLUTION,
    pixelFormat: "rgb",
    enablePhysicalBufferRotation: true,
    onFrame,
  });

  useEffect(() => () => settlePendingLiveFrame()?.reject(new Error("Live frame source closed")), [settlePendingLiveFrame]);

  const grabLiveFrame = useCallback(
    () =>
      new Promise<Image>((resolve, reject) => {
        settlePendingLiveFrame()?.reject(new Error("Live frame superseded"));
        const timeout = setTimeout(() => {
          pendingLiveFrameRef.current = null;
          liveFrameRequested.setDirty(false);
          reject(new Error("Timed out waiting for a live frame"));
        }, LIVE_FRAME_TIMEOUT_MS);
        pendingLiveFrameRef.current = { resolve, reject, timeout };
        liveFrameRequested.setDirty(true);
      }),
    [liveFrameRequested, settlePendingLiveFrame],
  );

  return { liveFrameOutput, grabLiveFrame };
}
