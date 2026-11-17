import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import { isScannedCode, useObjectOutput, usePhotoOutput, type ScannedObject } from "react-native-vision-camera";
import { captureFrame } from "@/features/scanner/lib/frame";
import { decodeQrCode } from "@/features/scanner/lib/qr-code";
import { QR_DECODE_LONG_SIDE, QR_OBJECT_TYPES, QR_SCAN_INTERVAL_MS } from "@/lib/constants/phone-camera";
import { CAPTURE_TARGET_RESOLUTION } from "@/lib/constants/scanner";
import type { QrScanner } from "@/lib/interfaces/scanner";

function useNativeQrScanner(onCode: (value: string) => void): QrScanner {
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;
  const onObjectsScanned = useCallback((objects: ScannedObject[]) => {
    for (const object of objects) {
      if (isScannedCode(object) && object.value) {
        onCodeRef.current(object.value);
        return;
      }
    }
  }, []);
  const output = useObjectOutput({ types: QR_OBJECT_TYPES, onObjectsScanned });
  return { outputs: [output] };
}

function useFrameQrScanner(onCode: (value: string) => void, active: boolean): QrScanner {
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;
  const output = usePhotoOutput({ targetResolution: CAPTURE_TARGET_RESOLUTION, qualityPrioritization: "speed" });

  useEffect(() => {
    if (!active) return;
    let busy = false;
    let cancelled = false;
    const timer = setInterval(() => {
      if (busy) return;
      busy = true;
      void (async () => {
        try {
          const frame = await captureFrame(output);
          const code = await decodeQrCode(frame.image, QR_DECODE_LONG_SIDE);
          if (code && !cancelled) onCodeRef.current(code);
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
  }, [active, output]);

  return { outputs: [output] };
}

export const useQrScanner: (onCode: (value: string) => void, active: boolean) => QrScanner =
  Platform.OS === "ios" ? useNativeQrScanner : useFrameQrScanner;
