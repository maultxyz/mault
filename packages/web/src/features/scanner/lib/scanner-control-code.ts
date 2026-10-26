import { isScannerControlCode } from "@magic-vault/shared";
import { decodeQrCode } from "@/features/scanner/lib/qr-code";
import { SCANNER_CONTROL_QR_MAX_DIMENSION } from "@/lib/constants/scanner";

let scratchCanvas: HTMLCanvasElement | null = null;

export function readScannerControlCode(
  canvas: HTMLCanvasElement,
): string | null {
  scratchCanvas ??= document.createElement("canvas");
  const text = decodeQrCode(
    canvas,
    canvas.width,
    canvas.height,
    SCANNER_CONTROL_QR_MAX_DIMENSION,
    scratchCanvas,
  );
  return text && isScannerControlCode(text) ? text : null;
}
