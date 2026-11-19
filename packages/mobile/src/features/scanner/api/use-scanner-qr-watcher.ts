import { useCallback, useMemo, useRef } from "react";
import type { CameraOutput } from "react-native-vision-camera";
import { decodeQrCode } from "@/features/scanner/lib/qr-code";
import { parseScannerQrLink } from "@/features/scanner/lib/scanner-qr-link";
import {
  QR_DECODE_LONG_SIDE,
  QR_SCAN_INTERVAL_MS,
  QR_SCAN_WITH_CARD_INTERVAL_MS,
} from "@/lib/constants/phone-camera";
import type { LiveFrameInspector, ScannerQrWatcher, ScannerQrWatcherOptions } from "@/lib/interfaces/scanner";

const NO_OUTPUTS: CameraOutput[] = [];

export function useScannerQrWatcher({ active, onQrLink }: ScannerQrWatcherOptions): ScannerQrWatcher {
  const latestRef = useRef({ active, onQrLink });
  latestRef.current = { active, onQrLink };
  const lastDecodeAtRef = useRef(0);

  const inspectLiveFrame = useCallback<LiveFrameInspector>(async (image, isCardDetected) => {
    if (!latestRef.current.active) return;
    const decodeIntervalMs = isCardDetected ? QR_SCAN_WITH_CARD_INTERVAL_MS : QR_SCAN_INTERVAL_MS;
    if (Date.now() - lastDecodeAtRef.current < decodeIntervalMs) return;
    lastDecodeAtRef.current = Date.now();
    const text = await decodeQrCode(image, QR_DECODE_LONG_SIDE);
    const qrLink = text ? parseScannerQrLink(text) : null;
    if (qrLink && latestRef.current.active) latestRef.current.onQrLink(qrLink);
  }, []);

  return useMemo(() => ({ outputs: NO_OUTPUTS, inspectLiveFrame }), [inspectLiveFrame]);
}
