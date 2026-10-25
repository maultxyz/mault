import jsQR from "jsqr";
import type { Image } from "react-native-nitro-image";
import { resizedPixels } from "@/features/scanner/lib/frame";

export async function decodeQrCode(image: Image, maxLongSide: number): Promise<string | null> {
  const scale = Math.min(1, maxLongSide / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  const pixels = await resizedPixels(image, width, height);
  const data = new Uint8ClampedArray(pixels.data.buffer, pixels.data.byteOffset, pixels.data.length);
  const code = jsQR(data, pixels.width, pixels.height, { inversionAttempts: "dontInvert" });
  return code?.data || null;
}
