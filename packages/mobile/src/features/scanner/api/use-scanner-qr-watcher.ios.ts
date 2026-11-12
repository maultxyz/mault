import { useCallback, useRef } from "react";
import { isScannedCode, useObjectOutput, type ScannedObject } from "react-native-vision-camera";
import { parseScannerQrLink } from "@/features/scanner/lib/scanner-qr-link";
import { QR_OBJECT_TYPES } from "@/lib/constants/phone-camera";
import type { ScannerQrWatcher, ScannerQrWatcherOptions } from "@/lib/interfaces/scanner";

export function useScannerQrWatcher({ active, onQrLink }: ScannerQrWatcherOptions): ScannerQrWatcher {
  const latestRef = useRef({ active, onQrLink });
  latestRef.current = { active, onQrLink };
  const onObjectsScanned = useCallback((objects: ScannedObject[]) => {
    if (!latestRef.current.active) return;
    for (const object of objects) {
      const qrLink = isScannedCode(object) && object.value ? parseScannerQrLink(object.value) : null;
      if (qrLink) {
        latestRef.current.onQrLink(qrLink);
        return;
      }
    }
  }, []);
  const output = useObjectOutput({ types: QR_OBJECT_TYPES, onObjectsScanned });
  return { outputs: [output] };
}
