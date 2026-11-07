import { STANDALONE_DOCUMENT_FEED_STATUSES } from "@/lib/constants/scanner";
import type { StandaloneDocumentFeederOptions } from "@/lib/interfaces/scanner";
import { scanLog } from "@/lib/scan-log";
import type { DesktopDocumentScannerFeedResult } from "@magic-vault/shared";
import { useCallback, useEffect, useRef, useState } from "react";

export function useStandaloneDocumentFeeder({
  isEnabled,
  isAutoFeedEnabled,
  scannerStatus,
  feedDocumentScannerCard,
  discardDocumentScannerPage,
  onCardReady,
  onHopperEmpty,
  onFeedFailed,
}: StandaloneDocumentFeederOptions) {
  const isFeedingRef = useRef(false);
  const [isFeeding, setIsFeeding] = useState(false);
  const isEnabledRef = useRef(isEnabled);
  isEnabledRef.current = isEnabled;
  const latest = {
    feedDocumentScannerCard,
    discardDocumentScannerPage,
    onCardReady,
    onHopperEmpty,
    onFeedFailed,
  };
  const latestRef = useRef(latest);
  latestRef.current = latest;
  const canFeedOneCard =
    isEnabled && !isFeeding && STANDALONE_DOCUMENT_FEED_STATUSES.includes(scannerStatus);

  const feedOneCard = useCallback(async () => {
    if (isFeedingRef.current) return;
    isFeedingRef.current = true;
    setIsFeeding(true);
    try {
      const result = await latestRef.current
        .feedDocumentScannerCard()
        .catch((error: unknown): DesktopDocumentScannerFeedResult => ({
          type: "error",
          reason: "unknown",
          message: String(error),
        }));
      if (!isEnabledRef.current) {
        if (result.type === "page") latestRef.current.discardDocumentScannerPage();
        return;
      }
      if (result.type === "page") {
        latestRef.current.onCardReady();
        return;
      }
      scanLog(
        `[document-scanner] standalone feed failed: ${result.reason} ${result.message ?? ""}`,
      );
      if (result.reason === "feeder_empty") latestRef.current.onHopperEmpty();
      else latestRef.current.onFeedFailed(result.reason);
    } finally {
      isFeedingRef.current = false;
      setIsFeeding(false);
    }
  }, []);

  useEffect(() => {
    if (!isEnabled || !isAutoFeedEnabled) return;
    if (!STANDALONE_DOCUMENT_FEED_STATUSES.includes(scannerStatus)) return;
    void feedOneCard();
  }, [isEnabled, isAutoFeedEnabled, scannerStatus, feedOneCard]);

  return {
    isFeeding,
    canFeedOneCard,
    feedOneCard: () => {
      if (canFeedOneCard) void feedOneCard();
    },
  };
}
