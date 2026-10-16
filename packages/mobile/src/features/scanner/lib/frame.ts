import { Images, type Image, type RawPixelData } from "react-native-nitro-image";
import type { CameraPhotoOutput } from "react-native-vision-camera";
import type { RgbaImage } from "@magic-vault/shared";
import { bytesToBase64 } from "@/features/sorter/lib/bytes";
import { WORKING_LONG_SIDE } from "@/lib/constants/scanner";
import type { CapturedFrame } from "@/lib/interfaces/scanner";

const CHANNEL_ORDERS: Record<string, [number, number, number] | undefined> = {
  RGBA: [0, 1, 2],
  RGBX: [0, 1, 2],
  BGRA: [2, 1, 0],
  BGRX: [2, 1, 0],
  ARGB: [1, 2, 3],
  XRGB: [1, 2, 3],
  ABGR: [3, 2, 1],
  XBGR: [3, 2, 1],
};

export function rawToRgba(raw: RawPixelData): RgbaImage {
  const { width, height, pixelFormat } = raw;
  const source = new Uint8Array(raw.buffer);
  const bytesPerPixel = pixelFormat === "RGB" || pixelFormat === "BGR" ? 3 : 4;
  const stride = Math.floor(source.length / height);
  const tight = stride === width * 4;

  if (tight && (pixelFormat === "RGBA" || pixelFormat === "RGBX")) {
    return { width, height, data: source, channelOrder: "rgba" };
  }
  if (tight && (pixelFormat === "BGRA" || pixelFormat === "BGRX")) {
    return { width, height, data: source, channelOrder: "bgra" };
  }

  const order =
    CHANNEL_ORDERS[pixelFormat] ?? (pixelFormat === "BGR" ? [2, 1, 0] : [0, 1, 2]);
  const out = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const row = y * stride;
    for (let x = 0; x < width; x++) {
      const s = row + x * bytesPerPixel;
      const d = (y * width + x) * 4;
      out[d] = source[s + order[0]];
      out[d + 1] = source[s + order[1]];
      out[d + 2] = source[s + order[2]];
      out[d + 3] = 255;
    }
  }
  return { width, height, data: out, channelOrder: "rgba" };
}

export async function imageToRgba(image: Image): Promise<RgbaImage> {
  return rawToRgba(await image.toRawPixelDataAsync(false));
}

export async function captureFrame(output: CameraPhotoOutput): Promise<CapturedFrame> {
  const photo = await output.capturePhoto({ flashMode: "off", enableShutterSound: false }, {});
  let full: Image;
  try {
    full = await photo.toImageAsync();
  } finally {
    photo.dispose();
  }
  const longSide = Math.max(full.width, full.height);
  const scale = longSide > WORKING_LONG_SIDE ? WORKING_LONG_SIDE / longSide : 1;
  const image =
    scale < 1
      ? await full.resizeAsync(Math.round(full.width * scale), Math.round(full.height * scale))
      : full;
  return { image, pixels: await imageToRgba(image), scale };
}

export async function resizedPixels(image: Image, width: number, height: number): Promise<RgbaImage> {
  return imageToRgba(await image.resizeAsync(width, height));
}

function toRgbaBuffer(pixels: RgbaImage): ArrayBuffer {
  if (pixels.channelOrder !== "bgra") {
    const copy = new Uint8Array(pixels.data.length);
    copy.set(pixels.data);
    return copy.buffer;
  }
  const out = new Uint8Array(pixels.data.length);
  for (let i = 0; i < pixels.data.length; i += 4) {
    out[i] = pixels.data[i + 2];
    out[i + 1] = pixels.data[i + 1];
    out[i + 2] = pixels.data[i];
    out[i + 3] = 255;
  }
  return out.buffer;
}

export async function rgbaToImage(pixels: RgbaImage): Promise<Image> {
  return Images.loadFromRawPixelDataAsync({
    buffer: toRgbaBuffer(pixels),
    width: pixels.width,
    height: pixels.height,
    pixelFormat: "RGBA",
  });
}

export async function encodeJpegDataUrl(pixels: RgbaImage, quality: number): Promise<string> {
  const image = await rgbaToImage(pixels);
  const encoded = await image.toEncodedImageDataAsync("jpg", quality);
  return `data:image/jpeg;base64,${bytesToBase64(new Uint8Array(encoded.buffer))}`;
}

export async function writeJpegTempFile(pixels: RgbaImage, quality: number): Promise<string> {
  const image = await rgbaToImage(pixels);
  const path = await image.saveToTemporaryFileAsync("jpg", quality);
  return path.startsWith("file://") ? path : `file://${path}`;
}
