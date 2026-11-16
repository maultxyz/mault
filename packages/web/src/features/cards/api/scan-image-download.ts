import { apiGetBlob } from "@/lib/api/client";
import {
  collectionScanImageDownloadPath,
  type ScanImageSide,
} from "@magic-vault/shared";

export function loadCollectionScanImageDownload(
  collectionGuid: string,
  scanId: string,
  side: ScanImageSide,
): Promise<Blob> {
  return apiGetBlob(collectionScanImageDownloadPath(collectionGuid, scanId, side));
}
