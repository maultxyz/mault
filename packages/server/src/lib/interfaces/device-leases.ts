export interface DeviceLease {
  timer: ReturnType<typeof setTimeout>;
  lastScanAt: number | null;
}

export type DeviceLeaseExpiredListener = (
  orgId: string,
  deviceKey: string,
  lastScanAt: number | null,
) => void;
