import { MACHINE_CAMERA_FRAME_INTERVAL_MS, machineShowsLiveCamera, type MachineStatus } from "@magic-vault/shared";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { fetchMachineCameraFrameUri } from "@/features/machines/api/machines";
import type { MachineCameraFrameState } from "@/lib/interfaces/machines";

export function useMachineCameraFrame(machine: MachineStatus, isVisible: boolean): MachineCameraFrameState {
  const showsCamera = machineShowsLiveCamera(machine) && isVisible;
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (!showsCamera) {
      setImageUri(null);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const loadNextFrame = async () => {
      if (cancelled) return;
      if (AppState.currentState === "active") {
        const frame = await fetchMachineCameraFrameUri(machine.machineId).catch(() => null);
        if (cancelled) return;
        if (frame) setImageUri(frame);
      }
      timer = setTimeout(() => void loadNextFrame(), MACHINE_CAMERA_FRAME_INTERVAL_MS);
    };
    void loadNextFrame();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [machine.machineId, showsCamera]);

  return { imageUri: showsCamera ? imageUri : null, isConnecting: showsCamera && !imageUri };
}
