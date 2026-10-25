import { useDevice } from "@/features/calibration/api/use-device";
import { useSerial } from "@/features/scanner/api/use-serial";
import { STALE_DEVICE_THRESHOLD_DAYS } from "@/lib/constants/scanner";
import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { PendingConnectKind } from "@/lib/interfaces/calibration";

export function useConnectWithStaleCheck() {
  const { connect, connectBluetooth, connectCloud, runTest } = useSerial();
  const device = useDevice();
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState<PendingConnectKind | null>(null);

  const isStale = useMemo(() => {
    if (!device?.updatedAt) return false;
    const updatedAt = new Date(device.updatedAt).getTime();
    if (Number.isNaN(updatedAt)) return false;
    const thresholdMs = STALE_DEVICE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
    return Date.now() - updatedAt > thresholdMs;
  }, [device?.updatedAt]);

  const guardedConnect = useCallback(
    (kind: PendingConnectKind, deviceGuid?: string) => {
      const connectFn = (options?: { skipAutoTest?: boolean }) =>
        kind === "cloud" && deviceGuid
          ? connectCloud(deviceGuid, options)
          : kind === "usb"
            ? connect(options)
            : connectBluetooth(options);
      if (isStale) {
        setPending(kind);
        void connectFn({ skipAutoTest: true });
        return;
      }
      void connectFn();
    },
    [isStale, connect, connectBluetooth, connectCloud],
  );

  const handleRunTest = useCallback(() => {
    setPending(null);
    void runTest();
  }, [runTest]);

  const handleCalibrateFirst = useCallback(() => {
    setPending(null);
    if (!location.pathname.startsWith("/app/calibrate")) {
      navigate("/app/calibrate");
    }
  }, [navigate, location.pathname]);

  return {
    connect: () => guardedConnect("usb"),
    connectBluetooth: () => guardedConnect("bluetooth"),
    connectCloud: (deviceGuid: string) => guardedConnect("cloud", deviceGuid),
    staleDialogOpen: pending !== null,
    onDismissStaleDialog: () => setPending(null),
    onRunTest: handleRunTest,
    onCalibrateFirst: handleCalibrateFirst,
  };
}
