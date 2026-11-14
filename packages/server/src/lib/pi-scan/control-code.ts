import jsQR from "jsqr";
import sharp from "sharp";
import { isScannerControlCode } from "@magic-vault/shared";

export async function readPiScannerControlCode(
  frame: Buffer,
): Promise<string | null> {
  const { data, info } = await sharp(frame)
    .resize({
      width: 1024,
      height: 1024,
      fit: "inside",
      withoutEnlargement: true,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const text = jsQR(new Uint8ClampedArray(data), info.width, info.height, {
    inversionAttempts: "dontInvert",
  })?.data;
  return text && isScannerControlCode(text) ? text : null;
}
