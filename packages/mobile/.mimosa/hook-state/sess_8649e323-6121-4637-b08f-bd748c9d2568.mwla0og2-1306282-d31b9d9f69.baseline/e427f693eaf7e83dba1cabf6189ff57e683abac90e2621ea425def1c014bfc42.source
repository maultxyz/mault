import { useState } from "react";
import { useCameraDevice, useCameraDevices } from "react-native-vision-camera";
import { CAMERA_DEVICE_KEY } from "@/lib/constants/storage-keys";
import type { CameraChoice } from "@/lib/interfaces/scanner";
import { readKv, writeKv } from "@/lib/storage/kv";

export function useCameraChoice(): CameraChoice {
  const devices = useCameraDevices();
  const fallback = useCameraDevice("back");
  const [selectedId, setSelectedId] = useState<string | null>(() => readKv(CAMERA_DEVICE_KEY));
  const device = devices.find((d) => d.id === selectedId) ?? fallback;
  return {
    devices,
    device,
    select: (id: string) => {
      setSelectedId(id);
      writeKv(CAMERA_DEVICE_KEY, id);
    },
  };
}
