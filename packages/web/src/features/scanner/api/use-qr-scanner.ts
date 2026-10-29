import { assertHardwareAllowedWhileImpersonating } from "@/lib/auth/impersonation";
import {
  QR_SCAN_INTERVAL_MS,
  QR_SCAN_MAX_DIMENSION,
} from "@/lib/constants/scanner";
import type { QrScannerStatus } from "@/lib/interfaces/scanner";
import { useCallback, useEffect, useRef, useState } from "react";
import { stopMediaStream } from "@/features/scanner/lib/camera-stream";
import { decodeQrCode } from "@/features/scanner/lib/qr-code";

export function useQrScanner(onResult: (text: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<QrScannerStatus>("starting");
  const [attempt, setAttempt] = useState(0);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    const canvas = document.createElement("canvas");

    const tick = () => {
      const video = videoRef.current;
      if (video && video.readyState >= video.HAVE_CURRENT_DATA) {
        const code = decodeQrCode(
          video,
          video.videoWidth,
          video.videoHeight,
          QR_SCAN_MAX_DIMENSION,
          canvas,
        );
        if (code) onResultRef.current(code);
      }
      if (!cancelled) timer = window.setTimeout(tick, QR_SCAN_INTERVAL_MS);
    };

    Promise.resolve()
      .then(() => {
        assertHardwareAllowedWhileImpersonating();
        return navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      })
      .then(async (media) => {
        if (cancelled) {
          stopMediaStream(media);
          return;
        }
        stream = media;
        const video = videoRef.current;
        if (video) {
          video.srcObject = media;
          await video.play().catch(() => undefined);
        }
        if (cancelled) return;
        setStatus("scanning");
        tick();
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stopMediaStream(stream);
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setStatus("starting");
    setAttempt((value) => value + 1);
  }, []);

  return { videoRef, status, retry };
}
