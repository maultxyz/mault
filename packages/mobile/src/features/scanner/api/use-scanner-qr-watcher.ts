import { useEffect, useRef } from "react";
import { decodeQrCode } from "@/features/scanner/lib/qr-code";
import { parseScannerQrLink } from "@/features/scanner/lib/scanner-qr-link";
import { QR_DECODE_LONG_SIDE, QR_SCAN_INTERVAL_MS } from "@/lib/constants/phone-camera";
import type { ScannerQrWatcher, ScannerQrWatcherOptions } from "@/lib/interfaces/scanner";

const NO_OUTPUTS: ScannerQrWatcher = { outputs: [] };

export function useScannerQrWatcher({ active, onQrLink, grabLiveFrame }: ScannerQrWatcherOptions): ScannerQrWatcher {
  const onQrLinkRef = useRef(onQrLink);
  onQrLinkRef.current = onQrLink;

  useEffect(() => {
    if (!active) return;
    let busy = false;
    let cancelled = false;
    const timer = setInterval(() => {
      if (busy) return;
      busy = true;
      void (async () => {
        try {
          const image = await grabLiveFrame();
          const text = await decodeQrCode(image, QR_DECODE_LONG_SIDE);
          const qrLink = text ? parseScannerQrLink(text) : null;
          if (qrLink && !cancelled) onQrLinkRef.current(qrLink);
        } catch {
        } finally {
          busy = false;
        }
      })();
    }, QR_SCAN_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [active, grabLiveFrame]);

  return NO_OUTPUTS;
}
