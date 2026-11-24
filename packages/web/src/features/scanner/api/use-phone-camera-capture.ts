import { fetchPhoneCameraCaptureDataUrl } from "@/features/collections/api/phone-camera-signal";
import { useCameraSignalChannel } from "@/features/scanner/api/use-camera-signal-channel";
import {
  CAPTURE_TIMEOUT_MS,
  PRESENCE_TIMEOUT_MS,
} from "@/lib/constants/timing";
import type {
  PhoneCameraCaptureOptions,
  PhoneCameraCaptureStatus,
  PendingCapture,
} from "@/lib/interfaces/scanner";
import type { PhoneCameraMessage, ScanRegion } from "@magic-vault/shared";
import { useCallback, useEffect, useRef, useState } from "react";

export function usePhoneCameraCapture(collectionGuid: string | undefined) {
  const [status, setStatus] = useState<PhoneCameraCaptureStatus>("idle");
  const [phoneCapturesWhenCardSettles, setPhoneCapturesWhenCardSettles] =
    useState(false);
  const activeRef = useRef(false);
  const presenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCaptureRef = useRef<PendingCapture | null>(null);
  const collectionGuidRef = useRef(collectionGuid);
  collectionGuidRef.current = collectionGuid;

  const clearPresenceTimeout = useCallback(() => {
    if (presenceTimeoutRef.current) {
      clearTimeout(presenceTimeoutRef.current);
      presenceTimeoutRef.current = null;
    }
  }, []);

  const markAbsent = useCallback(() => {
    clearPresenceTimeout();
    setPhoneCapturesWhenCardSettles(false);
    if (activeRef.current) setStatus("waiting");
  }, [clearPresenceTimeout]);

  const resolvePending = useCallback((dataUrl: string | null) => {
    const pending = pendingCaptureRef.current;
    if (!pending) return;
    clearTimeout(pending.timeout);
    pendingCaptureRef.current = null;
    pending.resolve(dataUrl);
  }, []);

  const receiveCapture = useCallback(
    (message: PhoneCameraMessage) => {
      const pending = pendingCaptureRef.current;
      if (!pending || pending.requestId !== message.requestId) return;
      if (message.imageDataUrl || !message.imageIsStoredOnServer) {
        resolvePending(message.imageDataUrl ?? null);
        return;
      }
      const guid = collectionGuidRef.current;
      if (!guid) {
        resolvePending(null);
        return;
      }
      fetchPhoneCameraCaptureDataUrl(guid, pending.requestId)
        .then((dataUrl) => {
          if (pendingCaptureRef.current === pending) resolvePending(dataUrl);
        })
        .catch(() => {
          if (pendingCaptureRef.current === pending) resolvePending(null);
        });
    },
    [resolvePending],
  );

  const handleMessage = useCallback(
    (message: PhoneCameraMessage) => {
      if (message.kind === "camera_ready") {
        if (!activeRef.current) return;
        setStatus("connected");
        setPhoneCapturesWhenCardSettles(!!message.capturesWhenCardSettles);
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
      if (message.kind === "capture_response") receiveCapture(message);
    },
    [clearPresenceTimeout, markAbsent, resolvePending, receiveCapture],
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
    setPhoneCapturesWhenCardSettles(false);
    setStatus("idle");
    resolvePending(null);
  }, [clearPresenceTimeout, resolvePending, send]);

  const requestCapture = useCallback(
    ({ maxCardSettleWaitMs = 0 }: PhoneCameraCaptureOptions = {}): Promise<
      string | null
    > => {
      if (status !== "connected") return Promise.resolve(null);
      return new Promise((resolve) => {
        resolvePending(null);
        const requestId = crypto.randomUUID();
        const timeout = setTimeout(() => {
          pendingCaptureRef.current = null;
          resolve(null);
        }, CAPTURE_TIMEOUT_MS + maxCardSettleWaitMs);
        pendingCaptureRef.current = { requestId, resolve, timeout };
        send({
          kind: "capture_requested",
          requestId,
          ...(maxCardSettleWaitMs > 0 ? { maxCardSettleWaitMs } : {}),
        });
      });
    },
    [status, send, resolvePending],
  );

  const sendScanRegion = useCallback(
    (region: ScanRegion) => {
      if (status !== "connected") return;
      send({ kind: "scan_region_updated", scanRegion: region });
    },
    [status, send],
  );

  useEffect(() => stop, [stop]);

  return {
    status,
    phoneCapturesWhenCardSettles,
    start,
    stop,
    requestCapture,
    sendScanRegion,
  };
}
