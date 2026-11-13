import type { RgbaImage } from "@magic-vault/shared";
import sharp from "sharp";

export async function rgbaFromImageBuffer(buffer: Buffer): Promise<RgbaImage> {
  const { data, info } = await sharp(buffer)
    .rotate()
    .flatten({ background: "#000000" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    width: info.width,
    height: info.height,
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
  };
}
