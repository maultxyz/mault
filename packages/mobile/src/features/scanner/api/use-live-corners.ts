import { useEffect, useRef, useState, type RefObject } from "react";
import type { CameraRef } from "react-native-vision-camera";
import { maxCornerShift } from "@magic-vault/shared";
import { detectCornersInImage } from "@/features/scanner/lib/inference";
import {
  LIVE_CORNERS_SUPPORTED,
  LIVE_DETECTION_INTERVAL_MS,
  LIVE_OUTLINE_DEADBAND_RATIO,
  LIVE_OUTLINE_MISSES_BEFORE_HIDE,
} from "@/lib/constants/scanner";
import type { LiveCorners } from "@/lib/interfaces/scanner";

export function useLiveCorners(
  cameraRef: RefObject<CameraRef | null>,
  active: boolean,
  paused: boolean,
  onDetection?: (corners: LiveCorners | null) => void,
): LiveCorners | null {
  const [corners, setCorners] = useState<LiveCorners | null>(null);
  const busyRef = useRef(false);
  const shownRef = useRef<LiveCorners | null>(null);
  const missCountRef = useRef(0);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const onDetectionRef = useRef(onDetection);
  onDetectionRef.current = onDetection;
  const supported = LIVE_CORNERS_SUPPORTED;

  useEffect(() => {
    if (!active || !supported) {
      shownRef.current = null;
      missCountRef.current = 0;
      setCorners(null);
      return;
    }
    const show = (detected: LiveCorners | null) => {
      const shown = shownRef.current;
      if (!detected) {
        missCountRef.current += 1;
        if (!shown || missCountRef.current < LIVE_OUTLINE_MISSES_BEFORE_HIDE) return;
        shownRef.current = null;
        setCorners(null);
        return;
      }
      missCountRef.current = 0;
      const deadband = Math.min(detected.frameWidth, detected.frameHeight) * LIVE_OUTLINE_DEADBAND_RATIO;
      if (
        shown &&
        shown.frameWidth === detected.frameWidth &&
        shown.frameHeight === detected.frameHeight &&
        maxCornerShift(shown.contour, detected.contour) < deadband
      ) {
        return;
      }
      shownRef.current = detected;
      setCorners(detected);
    };
    let cancelled = false;
    const interval = setInterval(() => {
      const camera = cameraRef.current;
      if (busyRef.current || pausedRef.current || !camera) return;
      busyRef.current = true;
      void camera
        .takeSnapshot()
        .then(async (image) => {
          if (pausedRef.current) return;
          const detection = await detectCornersInImage(image, image.width, image.height);
          if (cancelled || pausedRef.current) return;
          const next =
            detection.cardPresent && detection.contour
              ? { contour: detection.contour, frameWidth: image.width, frameHeight: image.height }
              : null;
          show(next);
          onDetectionRef.current?.(next);
        })
        .catch(() => {
          if (cancelled) return;
          show(null);
          onDetectionRef.current?.(null);
        })
        .finally(() => {
          busyRef.current = false;
        });
    }, LIVE_DETECTION_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [cameraRef, active, supported]);

  return corners;
}
