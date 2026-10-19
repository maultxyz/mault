import sharp from "sharp";
import type { ScanRegion } from "@magic-vault/shared";
import { PI_CAMERA_FRAME_URL, PI_SCAN_CARD_ASPECT } from "../constants/pi-scan";

export async function grabCameraFrame(): Promise<Buffer> {
  const response = await fetch(PI_CAMERA_FRAME_URL);
  if (!response.ok) {
    throw new Error("The Pi camera is not running.");
  }
  const frame = Buffer.from(await response.arrayBuffer());
  if (frame.length < 4 || frame[0] !== 0xff || frame[1] !== 0xd8) {
    throw new Error("The Pi camera returned a frame that is not a JPEG.");
  }
  return frame;
}

export async function cropScanRegion(
  frame: Buffer,
  region: ScanRegion,
): Promise<Buffer> {
  const meta = await sharp(frame).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) return frame;

  const cardAspect =
    width >= height ? 1 / PI_SCAN_CARD_ASPECT : PI_SCAN_CARD_ASPECT;
  let boxH = height * region.coverage;
  let boxW = boxH * cardAspect;
  if (boxW > width * region.coverage) {
    boxW = width * region.coverage;
    boxH = boxW / cardAspect;
  }
  let left = Math.round((width - boxW) / 2 + region.offsetX * width);
  let top = Math.round((height - boxH) / 2 + region.offsetY * height);
  let cropW = Math.round(boxW);
  let cropH = Math.round(boxH);
  left = Math.max(0, Math.min(left, width - 1));
  top = Math.max(0, Math.min(top, height - 1));
  cropW = Math.max(1, Math.min(cropW, width - left));
  cropH = Math.max(1, Math.min(cropH, height - top));
  return sharp(frame)
    .extract({ left, top, width: cropW, height: cropH })
    .jpeg()
    .toBuffer();
}
