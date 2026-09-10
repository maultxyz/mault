import { ESP32_MOUNT_TYPE_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { useEffect, useState } from "react";

export type Esp32MountType = "breakout" | "bare";

export function useEsp32MountType() {
  const [mountType, setMountTypeState] = useState<Esp32MountType>("breakout");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ESP32_MOUNT_TYPE_STORAGE_KEY);
      if (raw === "breakout" || raw === "bare") setMountTypeState(raw);
    } catch {}
  }, []);

  const setMountType = (value: Esp32MountType) => {
    setMountTypeState(value);
    try {
      localStorage.setItem(ESP32_MOUNT_TYPE_STORAGE_KEY, value);
    } catch {}
  };

  return { mountType, setMountType };
}
