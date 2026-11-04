import { releaseCanvases } from "@/features/scanner/lib/scan-canvas";
import type { RgbaImage } from "@magic-vault/shared";

export function encodeImageAsJpeg(
  image: RgbaImage,
  width: number,
  quality: number,
): string | null {
  const source = document.createElement("canvas");
  source.width = image.width;
  source.height = image.height;
  const scaled = document.createElement("canvas");
  scaled.width = width;
  scaled.height = Math.round((image.height / image.width) * width);
  try {
    const sourceContext = source.getContext("2d");
    const scaledContext = scaled.getContext("2d");
    if (!sourceContext || !scaledContext) return null;
    sourceContext.putImageData(
      image instanceof ImageData
        ? image
        : new ImageData(new Uint8ClampedArray(image.data), image.width, image.height),
      0,
      0,
    );
    scaledContext.drawImage(source, 0, 0, scaled.width, scaled.height);
    return scaled.toDataURL("image/jpeg", quality);
  } finally {
    releaseCanvases([source, scaled]);
  }
}
