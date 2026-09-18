import { useDevice } from "@/features/calibration/api/use-device";
import { useSerial } from "@/features/scanner/api/use-serial";
import { STALE_DEVICE_THRESHOLD_DAYS } from "@/lib/constants/scanner";
import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type PendingConnectKind = "usb" | "bluetooth";

export function useConnectWithStaleCheck() {
  const { connect, connectBluetooth, runTest } = useSerial();
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

  // Always connects immediately either way - staleness only decides whether
  // the connect self-test runs automatically or waits on the dialog choice.
  const guardedConnect = useCallback(
    (kind: PendingConnectKind) => {
      const connectFn = kind === "usb" ? connect : connectBluetooth;
      if (isStale) {
        setPending(kind);
        void connectFn({ skipAutoTest: true });
        return;
      }
      void connectFn();
    },
    [isStale, connect, connectBluetooth],
  );

  const handleRunTest = useCallback(() => {
    setPending(null);
    void runTest();
  }, [runTest]);

  const handleCalibrateFirst = useCallback(() => {
    setPending(null);
    if (location.pathname !== "/app/calibrate") navigate("/app/calibrate");
  }, [navigate, location.pathname]);

  return {
    connect: () => guardedConnect("usb"),
    connectBluetooth: () => guardedConnect("bluetooth"),
    staleDialogOpen: pending !== null,
    onDismissStaleDialog: () => setPending(null),
    onRunTest: handleRunTest,
    onCalibrateFirst: handleCalibrateFirst,
  };
}
