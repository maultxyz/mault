import { readKvJson, writeKvJson } from "@/lib/storage/kv";
import { SCAN_TARGET_COLLECTIONS_KEY } from "@/lib/constants/storage-keys";

const listeners = new Set<() => void>();
let scanTargetGuidsByOrgId = readKvJson<Record<string, string>>(SCAN_TARGET_COLLECTIONS_KEY, {});

export function subscribeToScanTargets(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readScanTargetGuidsByOrgId(): Record<string, string> {
  return scanTargetGuidsByOrgId;
}

export function saveScanTargetGuid(orgId: string, collectionGuid: string): void {
  if (scanTargetGuidsByOrgId[orgId] === collectionGuid) return;
  scanTargetGuidsByOrgId = { ...scanTargetGuidsByOrgId, [orgId]: collectionGuid };
  writeKvJson(SCAN_TARGET_COLLECTIONS_KEY, scanTargetGuidsByOrgId);
  for (const listener of listeners) listener();
}
