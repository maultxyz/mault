import {
  QR_SCAN_INTERVAL_MS,
  QR_SCAN_MAX_DIMENSION,
} from "@/lib/constants/scanner";
import type { QrScannerStatus } from "@/lib/interfaces/scanner";
import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState } from "react";

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
    const context = canvas.getContext("2d", { willReadFrequently: true });

    const tick = () => {
      const video = videoRef.current;
      if (
        context &&
        video &&
        video.readyState >= video.HAVE_CURRENT_DATA &&
        video.videoWidth > 0
      ) {
        const scale = Math.min(
          1,
          QR_SCAN_MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight),
        );
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(image.data, image.width, image.height, {
          inversionAttempts: "dontInvert",
        });
        if (code?.data) onResultRef.current(code.data);
      }
      if (!cancelled) timer = window.setTimeout(tick, QR_SCAN_INTERVAL_MS);
    };

    Promise.resolve()
      .then(() =>
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        }),
      )
      .then(async (media) => {
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
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
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setStatus("starting");
    setAttempt((value) => value + 1);
  }, []);

  return { videoRef, status, retry };
}
