import sharp from "sharp";
import { EXIF_ORIENTATION_TRANSPOSED_FROM } from "./constants/card-search";

export async function toPortraitCardImage(buffer: Buffer): Promise<Buffer> {
  const { width, height, orientation } = await sharp(buffer).metadata();
  if (!width || !height) return buffer;
  const transposed = (orientation ?? 1) >= EXIF_ORIENTATION_TRANSPOSED_FROM;
  const isLandscape = transposed ? height > width : width > height;
  if (!isLandscape) return buffer;
  const upright = await sharp(buffer).rotate().toBuffer();
  return sharp(upright).rotate(90).toBuffer();
}
