import { fetchMachineCameraFrame } from "@/features/machines/api/machines";
import type { MachineCameraFrameState } from "@/lib/interfaces/machines";
import {
  MACHINE_CAMERA_FRAME_INTERVAL_MS,
  machineShowsLiveCamera,
  type MachineStatus,
} from "@magic-vault/shared";
import { useEffect, useState } from "react";

export function useMachineCameraFrame(machine: MachineStatus): MachineCameraFrameState {
  const showsCamera = machineShowsLiveCamera(machine);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!showsCamera) {
      setImageUrl(null);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let currentUrl: string | null = null;

    const loadNextFrame = async () => {
      if (cancelled) return;
      if (document.visibilityState === "visible") {
        const frame = await fetchMachineCameraFrame(machine.machineId).catch(() => null);
        if (cancelled) return;
        if (frame) {
          const nextUrl = URL.createObjectURL(frame);
          if (currentUrl) URL.revokeObjectURL(currentUrl);
          currentUrl = nextUrl;
          setImageUrl(nextUrl);
        }
      }
      timer = setTimeout(() => void loadNextFrame(), MACHINE_CAMERA_FRAME_INTERVAL_MS);
    };
    void loadNextFrame();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [machine.machineId, showsCamera]);

  return { imageUrl: showsCamera ? imageUrl : null, isConnecting: showsCamera && !imageUrl };
}
