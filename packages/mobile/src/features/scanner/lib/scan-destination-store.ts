import type { ScanDestination } from "@magic-vault/shared";
import { SCAN_DESTINATIONS_KEY } from "@/lib/constants/storage-keys";
import { readKvJson, writeKvJson } from "@/lib/storage/kv";

const listeners = new Set<() => void>();
let scanDestinationsByOrgId = readKvJson<Record<string, ScanDestination>>(SCAN_DESTINATIONS_KEY, {});

export function subscribeToScanDestinations(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readScanDestinationsByOrgId(): Record<string, ScanDestination> {
  return scanDestinationsByOrgId;
}

export function saveScanDestination(orgId: string, destination: ScanDestination): void {
  scanDestinationsByOrgId = { ...scanDestinationsByOrgId, [orgId]: destination };
  writeKvJson(SCAN_DESTINATIONS_KEY, scanDestinationsByOrgId);
  for (const listener of listeners) listener();
}
