import { type RefObject, useCallback, useEffect, useState } from "react";
import type { CameraDevice, CameraRef } from "react-native-vision-camera";
import { TORCH_DEFAULT_STRENGTH_PERCENT, TORCH_MIN_STRENGTH_PERCENT } from "@/lib/constants/scanner";
import { TORCH_STRENGTH_PERCENT_KEY } from "@/lib/constants/storage-keys";
import type { CameraTorch } from "@/lib/interfaces/scanner";
import { readKv, writeKv } from "@/lib/storage/kv";

function readSavedStrengthPercent(): number {
  const saved = Number(readKv(TORCH_STRENGTH_PERCENT_KEY));
  return saved >= TORCH_MIN_STRENGTH_PERCENT && saved <= 100 ? saved : TORCH_DEFAULT_STRENGTH_PERCENT;
}

export function useCameraTorch(device: CameraDevice | undefined, cameraRef: RefObject<CameraRef | null>): CameraTorch {
  const [isRequestedOn, setIsRequestedOn] = useState(false);
  const [strengthPercent, setStrengthPercentState] = useState(readSavedStrengthPercent);
  const [cameraStartCount, setCameraStartCount] = useState(0);
  const hasTorch = !!device?.hasTorch;
  const supportsStrength = hasTorch && !!device?.supportsTorchStrength;
  const isOn = isRequestedOn && hasTorch;
  const minimumStrength = device?.minTorchStrength ?? 0;
  const maximumStrength = device?.maxTorchStrength ?? 1;

  useEffect(() => {
    const controller = cameraRef.current?.controller;
    if (!controller || !hasTorch || cameraStartCount === 0) return;
    const deviceStrength = minimumStrength + (strengthPercent / 100) * (maximumStrength - minimumStrength);
    const applyTorch = !isOn
      ? controller.setTorchMode("off")
      : supportsStrength
        ? controller.enableTorchWithStrength(deviceStrength)
        : controller.setTorchMode("on");
    applyTorch.catch((error: unknown) => {
      console.warn("Camera torch failed", error);
      setIsRequestedOn(false);
    });
  }, [cameraRef, cameraStartCount, hasTorch, isOn, maximumStrength, minimumStrength, strengthPercent, supportsStrength]);

  const onCameraStarted = useCallback(() => setCameraStartCount((count) => count + 1), []);
  const toggle = useCallback(() => setIsRequestedOn((current) => !current), []);
  const setStrengthPercent = useCallback((percent: number) => {
    setStrengthPercentState(percent);
    writeKv(TORCH_STRENGTH_PERCENT_KEY, String(percent));
  }, []);

  return { hasTorch, isOn, supportsStrength, strengthPercent, toggle, setStrengthPercent, onCameraStarted };
}
