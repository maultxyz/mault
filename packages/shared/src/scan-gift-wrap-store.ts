import {
  SCAN_GIFT_REVEAL_WRAPPED_MAX,
  SCAN_GIFT_REVEAL_WRAPPED_MAX_AGE_MS,
} from "./constants/scan-gift-reveal.constant";
import type {
  ScanGiftReveal,
  ScanGiftWrapStore,
  WrappedScanGiftReveal,
} from "./interfaces/scan-gift-reveal.interface";

export function createScanGiftWrapStore(): ScanGiftWrapStore {
  let wrappedReveals: readonly WrappedScanGiftReveal[] = [];
  let latestReveal: ScanGiftReveal | null = null;
  let storeVersion = 0;
  const seenScanIds = new Set<string>();
  const listeners = new Set<() => void>();
  const notify = () => {
    storeVersion += 1;
    listeners.forEach((listener) => listener());
  };
  return {
    wrap(reveal, wrappedAt = Date.now()) {
      if (seenScanIds.has(reveal.scanId)) return;
      seenScanIds.add(reveal.scanId);
      latestReveal = reveal;
      wrappedReveals = [...wrappedReveals, { reveal, wrappedAt }].slice(-SCAN_GIFT_REVEAL_WRAPPED_MAX);
      notify();
    },
    unwrap(scanId) {
      if (!wrappedReveals.some((wrapped) => wrapped.reveal.scanId === scanId)) return;
      wrappedReveals = wrappedReveals.filter((wrapped) => wrapped.reveal.scanId !== scanId);
      notify();
    },
    wrappedRevealFor(scanIds, now = Date.now()) {
      const wrapped = wrappedReveals.find(
        (candidate) =>
          scanIds.includes(candidate.reveal.scanId) &&
          now - candidate.wrappedAt < SCAN_GIFT_REVEAL_WRAPPED_MAX_AGE_MS,
      );
      return wrapped?.reveal ?? null;
    },
    latestReveal() {
      return latestReveal;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    version() {
      return storeVersion;
    },
  };
}
