import { useEffect, useRef, useState, type RefObject } from "react";
import { Platform } from "react-native";
import type { CameraRef } from "react-native-vision-camera";
import { detectCornersInImage } from "@/features/scanner/lib/inference";
import { LIVE_DETECTION_INTERVAL_MS } from "@/lib/constants/scanner";
import type { LiveCorners } from "@/lib/interfaces/scanner";

export function useLiveCorners(
  cameraRef: RefObject<CameraRef | null>,
  active: boolean,
  paused: boolean,
): LiveCorners | null {
  const [corners, setCorners] = useState<LiveCorners | null>(null);
  const busyRef = useRef(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const supported = Platform.OS === "android";

  useEffect(() => {
    if (!active || !supported) {
      setCorners(null);
      return;
    }
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
          setCorners(
            detection.cardPresent && detection.contour
              ? { contour: detection.contour, frameWidth: image.width, frameHeight: image.height }
              : null,
          );
        })
        .catch(() => {
          if (!cancelled) setCorners(null);
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
