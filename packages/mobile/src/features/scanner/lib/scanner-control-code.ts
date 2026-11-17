import { isScannerControlCode } from "@magic-vault/shared";
import { decodeQrCode } from "@/features/scanner/lib/qr-code";
import { SCANNER_CONTROL_QR_LONG_SIDE } from "@/lib/constants/scanner";
import type { CapturedFrame } from "@/lib/interfaces/scanner";

export async function readScannerControlCode(frame: CapturedFrame): Promise<string | null> {
  const text = await decodeQrCode(frame.image, SCANNER_CONTROL_QR_LONG_SIDE).catch(() => null);
  return text && isScannerControlCode(text) ? text : null;
}
