import { decodeQrCode } from "@/features/scanner/lib/qr-code";
import { SCANNER_CONTROL_QR_LONG_SIDE } from "@/lib/constants/scanner";
import type { CapturedFrame } from "@/lib/interfaces/scanner";

export function readScannerQrText(frame: CapturedFrame): Promise<string | null> {
  return decodeQrCode(frame.image, SCANNER_CONTROL_QR_LONG_SIDE).catch(() => null);
}
