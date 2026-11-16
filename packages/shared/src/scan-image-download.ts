import {
  SCAN_IMAGE_DOWNLOAD_FILE_NAME_FALLBACK,
  SCAN_IMAGE_DOWNLOAD_FILE_NAME_MAX_LENGTH,
  SCAN_IMAGE_SIDES,
  SCAN_IMAGE_SIDE_QUERY_PARAM,
} from "./constants/scan-image-download.constant";
import type { ScanImageSide } from "./interfaces/scan-image-download.interface";

export function parseScanImageSide(value: string | null | undefined): ScanImageSide {
  return SCAN_IMAGE_SIDES.find((side) => side === value) ?? "front";
}

export function collectionScanImageDownloadPath(
  collectionGuid: string,
  scanId: string,
  side: ScanImageSide,
): string {
  const params = new URLSearchParams({ [SCAN_IMAGE_SIDE_QUERY_PARAM]: side });
  return `/api/collections/${encodeURIComponent(collectionGuid)}/cards/${encodeURIComponent(scanId)}/image/download?${params}`;
}

export function scanImageDownloadFileName(cardName: string | null | undefined, side: ScanImageSide): string {
  const slug = (cardName ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SCAN_IMAGE_DOWNLOAD_FILE_NAME_MAX_LENGTH)
    .replace(/-+$/g, "");
  const base = slug || SCAN_IMAGE_DOWNLOAD_FILE_NAME_FALLBACK;
  return side === "back" ? `${base}-back-mault.jpg` : `${base}-mault.jpg`;
}
