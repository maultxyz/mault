import { createScanGiftWrapStore, type ScanGiftReveal } from "@magic-vault/shared";
import { useSyncExternalStore } from "react";

const scanGiftWrapStore = createScanGiftWrapStore();

export function showScanGiftReveal(reveal: ScanGiftReveal): void {
  scanGiftWrapStore.wrap(reveal);
}

export function markScanGiftUnwrapped(scanId: string): void {
  scanGiftWrapStore.unwrap(scanId);
}

function useScanGiftWrapStoreVersion(): number {
  return useSyncExternalStore(
    scanGiftWrapStore.subscribe,
    scanGiftWrapStore.version,
    scanGiftWrapStore.version,
  );
}

export function useWrappedScanGiftReveal(
  scanIds: string | readonly string[] | undefined,
): ScanGiftReveal | null {
  useScanGiftWrapStoreVersion();
  if (!scanIds) return null;
  return scanGiftWrapStore.wrappedRevealFor(typeof scanIds === "string" ? [scanIds] : scanIds);
}

export function useLatestScanGiftReveal(): ScanGiftReveal | null {
  useScanGiftWrapStoreVersion();
  return scanGiftWrapStore.latestReveal();
}
