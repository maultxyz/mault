import { useCameraSignalChannel } from "@/features/scanner/api/use-camera-signal-channel";
import {
  CAPTURE_TIMEOUT_MS,
  PRESENCE_TIMEOUT_MS,
} from "@/lib/constants/timing";
import type { PhoneCameraCaptureStatus } from "@/lib/interfaces/scanner";
import type { PhoneCameraMessage, ScanRegion } from "@magic-vault/shared";
import { useCallback, useEffect, useRef, useState } from "react";

export type { PhoneCameraCaptureStatus };

// The phone heartbeats "camera_ready" roughly this often while its camera
// is live (see use-phone-camera-responder.ts) - if we haven't heard one in
// a while, treat it as gone rather than waiting forever.

interface PendingCapture {
  requestId: string;
  resolve: (dataUrl: string | null) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export function usePhoneCameraCapture(collectionGuid: string | undefined) {
  const [status, setStatus] = useState<PhoneCameraCaptureStatus>("idle");
  const activeRef = useRef(false);
  const presenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCaptureRef = useRef<PendingCapture | null>(null);

  const clearPresenceTimeout = useCallback(() => {
    if (presenceTimeoutRef.current) {
      clearTimeout(presenceTimeoutRef.current);
      presenceTimeoutRef.current = null;
    }
  }, []);

  const markAbsent = useCallback(() => {
    clearPresenceTimeout();
    if (activeRef.current) setStatus("waiting");
  }, [clearPresenceTimeout]);

  const resolvePending = useCallback((dataUrl: string | null) => {
    const pending = pendingCaptureRef.current;
    if (!pending) return;
    clearTimeout(pending.timeout);
    pendingCaptureRef.current = null;
    pending.resolve(dataUrl);
  }, []);

  const handleMessage = useCallback(
    (message: PhoneCameraMessage) => {
      if (message.kind === "camera_ready") {
        if (!activeRef.current) return;
        setStatus("connected");
        clearPresenceTimeout();
        presenceTimeoutRef.current = setTimeout(
          markAbsent,
          PRESENCE_TIMEOUT_MS,
        );
        return;
      }
      if (message.kind === "camera_left") {
        markAbsent();
        resolvePending(null);
        return;
      }
      if (message.kind === "capture_response" && pendingCaptureRef.current) {
        if (pendingCaptureRef.current.requestId === message.requestId) {
          resolvePending(message.imageDataUrl ?? null);
        }
      }
    },
    [clearPresenceTimeout, markAbsent, resolvePending],
  );

  const { send } = useCameraSignalChannel(collectionGuid, handleMessage);

  const start = useCallback(() => {
    activeRef.current = true;
    setStatus("waiting");
  }, []);

  const stop = useCallback(() => {
    if (activeRef.current) send({ kind: "desktop_disconnected" });
    activeRef.current = false;
    clearPresenceTimeout();
    setStatus("idle");
    resolvePending(null);
  }, [clearPresenceTimeout, resolvePending, send]);

  const requestCapture = useCallback((): Promise<string | null> => {
    if (status !== "connected") return Promise.resolve(null);
    return new Promise((resolve) => {
      resolvePending(null); // cancel any stale in-flight request first
      const requestId = crypto.randomUUID();
      const timeout = setTimeout(() => {
        pendingCaptureRef.current = null;
        resolve(null);
      }, CAPTURE_TIMEOUT_MS);
      pendingCaptureRef.current = { requestId, resolve, timeout };
      send({ kind: "capture_requested", requestId });
    });
  }, [status, send, resolvePending]);

  const sendScanRegion = useCallback(
    (region: ScanRegion) => {
      if (status !== "connected") return;
      send({ kind: "scan_region_updated", scanRegion: region });
    },
    [status, send],
  );

  useEffect(() => stop, [stop]);

  return { status, start, stop, requestCapture, sendScanRegion };
}
