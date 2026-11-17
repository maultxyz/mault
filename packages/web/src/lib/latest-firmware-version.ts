let latestFirmwareVersion: string | null = null;
let settled = false;
const listeners = new Set<() => void>();

export function noteLatestFirmwareVersion(version: string | null) {
  if (settled) return;
  settled = true;
  latestFirmwareVersion = version;
  for (const listener of listeners) listener();
}

export function getLatestFirmwareVersion(): string | null {
  return latestFirmwareVersion;
}

export function subscribeLatestFirmwareVersion(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
