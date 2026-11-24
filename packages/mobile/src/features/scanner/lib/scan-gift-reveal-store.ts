import {
  createScanGiftWrapStore,
  type ScanGiftReveal,
} from "@magic-vault/shared";
import { useEffect, useSyncExternalStore } from "react";

const scanGiftWrapStore = createScanGiftWrapStore();
let displayedScanGiftScanId: string | null = null;

export const showScanGiftReveal = scanGiftWrapStore.wrap;
export const markScanGiftUnwrapped = scanGiftWrapStore.unwrap;

export function displayedScanIdForGiftReveal(): string | null {
  return displayedScanGiftScanId;
}

export function isScanGiftWrapped(scanId: string): boolean {
  return !!scanGiftWrapStore.wrappedRevealFor([scanId]);
}

export function useWrappedScanGiftReveal(scanId: string | null): ScanGiftReveal | null {
  useSyncExternalStore(
    scanGiftWrapStore.subscribe,
    scanGiftWrapStore.version,
    scanGiftWrapStore.version,
  );
  useEffect(() => {
    if (!scanId) return;
    displayedScanGiftScanId = scanId;
    return () => {
      if (displayedScanGiftScanId === scanId) displayedScanGiftScanId = null;
    };
  }, [scanId]);
  return scanId ? scanGiftWrapStore.wrappedRevealFor([scanId]) : null;
}

export function useLatestScanGiftReveal(): ScanGiftReveal | null {
  return useSyncExternalStore(
    scanGiftWrapStore.subscribe,
    scanGiftWrapStore.latestReveal,
    scanGiftWrapStore.latestReveal,
  );
}
