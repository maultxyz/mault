import {
  SCAN_IMAGE_IMPORT_MAX_DIMENSION_PX,
  SCAN_IMAGE_IMPORT_PADDING_COLOR,
  SCAN_IMAGE_IMPORT_PADDING_RATIO,
} from "@/lib/constants/scanner";
import type { ScanImageCanvas } from "@/lib/interfaces/scanner";

export async function drawScanImageFile(file: File): Promise<ScanImageCanvas> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(
      1,
      SCAN_IMAGE_IMPORT_MAX_DIMENSION_PX / Math.max(bitmap.width, bitmap.height),
    );
    const imageWidth = Math.round(bitmap.width * scale);
    const imageHeight = Math.round(bitmap.height * scale);
    const padding = Math.round(
      Math.max(imageWidth, imageHeight) * SCAN_IMAGE_IMPORT_PADDING_RATIO,
    );

    const canvas = document.createElement("canvas");
    canvas.width = imageWidth + padding * 2;
    canvas.height = imageHeight + padding * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");
    ctx.fillStyle = SCAN_IMAGE_IMPORT_PADDING_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, padding, padding, imageWidth, imageHeight);

    const right = padding + imageWidth;
    const bottom = padding + imageHeight;
    return {
      canvas,
      imageContour: {
        topLeft: { x: padding, y: padding },
        topRight: { x: right, y: padding },
        bottomRight: { x: right, y: bottom },
        bottomLeft: { x: padding, y: bottom },
      },
    };
  } finally {
    bitmap.close();
  }
}

export function sortFilesByName(files: File[]): File[] {
  return [...files].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  );
}
