import { DEVICE_LEASE_TTL_MS } from "./constants/timing";

// Lease key for a scan whose client couldn't say which device it came from.
export const UNIDENTIFIED_SORTER_LEASE_KEY = "unidentified";

interface Lease {
  timer: ReturnType<typeof setTimeout>;
}

// orgId -> deviceGuid -> lease. In process memory like scan-lock.ts, so it
// resets on a server restart; clients renew on a heartbeat and simply
// re-acquire.
const leases = new Map<string, Map<string, Lease>>();

function orgLeases(orgId: string) {
  let map = leases.get(orgId);
  if (!map) {
    map = new Map();
    leases.set(orgId, map);
  }
  return map;
}

function scheduleExpiry(orgId: string, deviceKey: string) {
  return setTimeout(
    () => releaseDeviceLease(orgId, deviceKey),
    DEVICE_LEASE_TTL_MS,
  );
}

// Acquires or renews the lease for one connected sorter. `limit` is the
// org's cap on simultaneously connected sorters (null = unlimited); renewing
// an already-held lease always succeeds so a downgrade never kicks off a
// sorter that's mid-session.
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
  map.set(deviceKey, { timer: scheduleExpiry(orgId, deviceKey) });
  return true;
}

export function releaseDeviceLease(orgId: string, deviceKey: string) {
  const map = leases.get(orgId);
  const lease = map?.get(deviceKey);
  if (!map || !lease) return;
  clearTimeout(lease.timer);
  map.delete(deviceKey);
  if (map.size === 0) leases.delete(orgId);
}
