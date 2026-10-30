import { releaseCanvases } from "@/features/scanner/lib/scan-canvas";
import {
  FLATBED_CROPPED_PAGE_QUALITY,
  FLATBED_DETECTION_DARK_LUMINANCE,
  FLATBED_DETECTION_MAX_DIMENSION_PX,
  FLATBED_DETECTION_MIN_DARK_PIXELS_PER_LINE,
  FLATBED_DETECTION_PADDING_MM,
  FLATBED_MIN_PLACEMENT_MM,
  FLATBED_SCAN_MARGIN_MM,
} from "@/lib/constants/scanner";
import { FLATBED_PLACEMENT_STORAGE_KEY_PREFIX } from "@/lib/constants/storage-keys";
import type { FlatbedPlacement } from "@/lib/interfaces/scanner";

function isPlacement(value: unknown): value is FlatbedPlacement {
  if (!value || typeof value !== "object") return false;
  const placement = value as Record<string, unknown>;
  return ["leftMm", "topMm", "widthMm", "heightMm"].every(
    (key) => typeof placement[key] === "number" && Number.isFinite(placement[key]),
  );
}

export function loadFlatbedPlacement(scannerKey: string): FlatbedPlacement | null {
  try {
    const raw = localStorage.getItem(FLATBED_PLACEMENT_STORAGE_KEY_PREFIX + scannerKey);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isPlacement(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function storeFlatbedPlacement(scannerKey: string, placement: FlatbedPlacement) {
  try {
    localStorage.setItem(
      FLATBED_PLACEMENT_STORAGE_KEY_PREFIX + scannerKey,
      JSON.stringify(placement),
    );
  } catch (error) {
    console.error("[flatbed] could not save the card position:", error);
  }
}

export function flatbedScanHeightMm(placement: FlatbedPlacement): number {
  return placement.topMm + placement.heightMm + FLATBED_SCAN_MARGIN_MM;
}

export function isPlacementLargeEnough(placement: FlatbedPlacement): boolean {
  return (
    placement.widthMm >= FLATBED_MIN_PLACEMENT_MM &&
    placement.heightMm >= FLATBED_MIN_PLACEMENT_MM
  );
}

function canvasToJpegFile(canvas: HTMLCanvasElement, fileName: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(new File([blob], fileName, { type: "image/jpeg" }));
        else reject(new Error("Could not encode the cropped scan"));
      },
      "image/jpeg",
      FLATBED_CROPPED_PAGE_QUALITY,
    );
  });
}

export async function cropFlatbedPage(
  page: File,
  scanWidthMm: number,
  placement: FlatbedPlacement,
): Promise<File> {
  const bitmap = await createImageBitmap(page);
  const canvas = document.createElement("canvas");
  try {
    const pixelsPerMm = bitmap.width / scanWidthMm;
    const left = Math.max(0, Math.round(placement.leftMm * pixelsPerMm));
    const top = Math.max(0, Math.round(placement.topMm * pixelsPerMm));
    const width = Math.min(bitmap.width - left, Math.round(placement.widthMm * pixelsPerMm));
    const height = Math.min(bitmap.height - top, Math.round(placement.heightMm * pixelsPerMm));
    if (width <= 0 || height <= 0) throw new Error("The card position is outside the scan");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not get canvas context");
    context.drawImage(bitmap, left, top, width, height, 0, 0, width, height);
    return await canvasToJpegFile(canvas, page.name);
  } finally {
    bitmap.close();
    releaseCanvases([canvas]);
  }
}

function darkLineRange(counts: Uint32Array): [number, number] | null {
  const first = counts.findIndex((count) => count >= FLATBED_DETECTION_MIN_DARK_PIXELS_PER_LINE);
  if (first < 0) return null;
  let last = first;
  for (let index = counts.length - 1; index > first; index--) {
    if (counts[index] >= FLATBED_DETECTION_MIN_DARK_PIXELS_PER_LINE) {
      last = index;
      break;
    }
  }
  return [first, last];
}

export async function detectCardPlacement(
  preview: File,
  glassWidthMm: number,
  glassHeightMm: number,
): Promise<FlatbedPlacement | null> {
  const bitmap = await createImageBitmap(preview);
  const canvas = document.createElement("canvas");
  try {
    const scale = Math.min(1, FLATBED_DETECTION_MAX_DIMENSION_PX / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const darkPerColumn = new Uint32Array(canvas.width);
    const darkPerRow = new Uint32Array(canvas.height);
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const offset = (y * canvas.width + x) * 4;
        const luminance = 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
        if (luminance < FLATBED_DETECTION_DARK_LUMINANCE) {
          darkPerColumn[x]++;
          darkPerRow[y]++;
        }
      }
    }
    const columns = darkLineRange(darkPerColumn);
    const rows = darkLineRange(darkPerRow);
    if (!columns || !rows) return null;
    const mmPerPixelX = glassWidthMm / canvas.width;
    const mmPerPixelY = glassHeightMm / canvas.height;
    const leftMm = Math.max(0, columns[0] * mmPerPixelX - FLATBED_DETECTION_PADDING_MM);
    const topMm = Math.max(0, rows[0] * mmPerPixelY - FLATBED_DETECTION_PADDING_MM);
    const placement: FlatbedPlacement = {
      leftMm,
      topMm,
      widthMm: Math.min(glassWidthMm - leftMm, (columns[1] + 1) * mmPerPixelX + FLATBED_DETECTION_PADDING_MM - leftMm),
      heightMm: Math.min(glassHeightMm - topMm, (rows[1] + 1) * mmPerPixelY + FLATBED_DETECTION_PADDING_MM - topMm),
    };
    return isPlacementLargeEnough(placement) ? placement : null;
  } finally {
    bitmap.close();
    releaseCanvases([canvas]);
  }
}
