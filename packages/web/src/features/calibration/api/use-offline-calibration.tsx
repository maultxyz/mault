import { useDevice } from "@/features/calibration/api/use-device";
import { useSerial } from "@/features/scanner/api/use-serial";
import type { OfflineCalibrationContextValue } from "@/lib/interfaces/calibration";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const OfflineCalibrationContext =
  createContext<OfflineCalibrationContextValue | null>(null);

export function OfflineCalibrationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isConnected } = useSerial();
  const device = useDevice();
  const [accepted, setAccepted] = useState(false);
  const canGoOffline = !isConnected && !!device;

  useEffect(() => {
    if (isConnected) setAccepted(false);
  }, [isConnected]);

  const accept = useCallback(() => setAccepted(true), []);
  const stop = useCallback(() => setAccepted(false), []);

  return (
    <OfflineCalibrationContext
      value={{
        isOffline: accepted && canGoOffline,
        canGoOffline,
        accept,
        stop,
      }}
    >
      {children}
    </OfflineCalibrationContext>
  );
}

export function useOfflineCalibration() {
  const context = useContext(OfflineCalibrationContext);
  if (!context) {
    throw new Error(
      "useOfflineCalibration must be used within an OfflineCalibrationProvider",
    );
  }
  return context;
}
