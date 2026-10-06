import { ESP32_MOUNT_TYPE_STORAGE_KEY } from "@/lib/constants/storage-keys";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type {
  Esp32MountType,
  Esp32MountTypeContextValue,
} from "@/lib/interfaces/build";

const Esp32MountTypeContext = createContext<Esp32MountTypeContextValue | null>(
  null,
);

export function Esp32MountTypeProvider({ children }: { children: ReactNode }) {
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

  return (
    <Esp32MountTypeContext value={{ mountType, setMountType }}>
      {children}
    </Esp32MountTypeContext>
  );
}

export function useEsp32MountType() {
  const context = useContext(Esp32MountTypeContext);
  if (!context) {
    throw new Error(
      "useEsp32MountType must be used within an Esp32MountTypeProvider",
    );
  }
  return context;
}
