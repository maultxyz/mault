import { DEVICE_LEASE_TTL_MS } from "./constants/timing";
import type {
  DeviceLease,
  DeviceLeaseExpiredListener,
} from "./interfaces/device-leases";

export const UNIDENTIFIED_SORTER_LEASE_KEY = "unidentified";

const leases = new Map<string, Map<string, DeviceLease>>();

let expiredListener: DeviceLeaseExpiredListener | null = null;

export function onDeviceLeaseExpired(listener: DeviceLeaseExpiredListener) {
  expiredListener = listener;
}

function orgLeases(orgId: string) {
  let map = leases.get(orgId);
  if (!map) {
    map = new Map();
    leases.set(orgId, map);
  }
  return map;
}

function scheduleExpiry(orgId: string, deviceKey: string) {
  return setTimeout(() => {
    const lastScanAt = leases.get(orgId)?.get(deviceKey)?.lastScanAt ?? null;
    releaseDeviceLease(orgId, deviceKey);
    expiredListener?.(orgId, deviceKey, lastScanAt);
  }, DEVICE_LEASE_TTL_MS);
}

export function acquireDeviceLease(
  orgId: string,
  deviceKey: string,
  limit: number | null,
): boolean {
  const map = orgLeases(orgId);
  const existing = map.get(deviceKey);
  if (existing) {
    clearTimeout(existing.timer);
    existing.timer = scheduleExpiry(orgId, deviceKey);
    return true;
  }
  if (limit !== null && map.size >= limit) return false;
  map.set(deviceKey, {
    timer: scheduleExpiry(orgId, deviceKey),
    lastScanAt: null,
  });
  return true;
}

export function markDeviceLeaseScanned(orgId: string, deviceKey: string) {
  const lease = leases.get(orgId)?.get(deviceKey);
  if (lease) lease.lastScanAt = Date.now();
}

export function releaseDeviceLease(orgId: string, deviceKey: string) {
  const map = leases.get(orgId);
  const lease = map?.get(deviceKey);
  if (!map || !lease) return;
  clearTimeout(lease.timer);
  map.delete(deviceKey);
  if (map.size === 0) leases.delete(orgId);
}

export function isDeviceLeased(orgId: string, deviceKey: string): boolean {
  return leases.get(orgId)?.has(deviceKey) ?? false;
}

export function countConnectedSorters(): number {
  let total = 0;
  for (const map of leases.values()) total += map.size;
  return total;
}
