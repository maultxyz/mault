import {
  DEFAULT_PERSISTED_SCAN_SETTINGS,
  parsePersistedScanSettings,
  serializePersistedScanSettings,
  type PersistedScanSettings,
} from "@magic-vault/shared";
import { SCAN_SETTINGS_STORAGE_KEY_PREFIX } from "@/lib/constants/storage-keys";

export function scanSettingsStorageKey(orgId: string | undefined): string | null {
  return orgId ? SCAN_SETTINGS_STORAGE_KEY_PREFIX + orgId : null;
}

export function readStoredScanSettings(
  storageKey: string | null,
): PersistedScanSettings {
  if (!storageKey) return DEFAULT_PERSISTED_SCAN_SETTINGS;
  try {
    return parsePersistedScanSettings(localStorage.getItem(storageKey));
  } catch {
    return DEFAULT_PERSISTED_SCAN_SETTINGS;
  }
}

export function writeStoredScanSettings(
  storageKey: string | null,
  settings: PersistedScanSettings,
): void {
  if (!storageKey) return;
  try {
    const serialized = serializePersistedScanSettings(settings);
    if (serialized === null) localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, serialized);
  } catch {}
}
