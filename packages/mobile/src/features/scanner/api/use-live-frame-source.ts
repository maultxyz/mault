import { useCallback, type RefObject } from "react";
import type { CameraRef } from "react-native-vision-camera";
import type { LiveFrameSource } from "@/lib/interfaces/scanner";

export function useLiveFrameSource(cameraRef: RefObject<CameraRef | null>): LiveFrameSource {
  const grabLiveFrame = useCallback(() => {
    const camera = cameraRef.current;
    if (!camera) return Promise.reject(new Error("Camera is not ready"));
    return camera.takeSnapshot();
  }, [cameraRef]);
  return { liveFrameOutput: null, grabLiveFrame };
}
