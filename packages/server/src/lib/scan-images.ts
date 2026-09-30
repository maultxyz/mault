import { OBJECT_STORAGE_ENABLED } from "./constants/object-storage";
import type {
  ScanImageKind,
  ScanImageTarget,
  StoredScanImage,
  StoredScanImageRow,
} from "./interfaces/scan-images";
import {
  deleteObjectPrefix,
  deleteObjects,
  orgObjectPrefix,
  parseDataUrl,
  presignObjectUrl,
  putObject,
} from "./object-storage";

export function orgScanImagePrefix(orgId: string): string {
  return orgObjectPrefix(orgId);
}

export function collectionScanImagePrefix(
  orgId: string,
  collectionGuid: string,
  kind?: ScanImageKind,
): string {
  const base = `${orgObjectPrefix(orgId)}collections/${collectionGuid}/`;
  return kind ? `${base}${kind}/` : base;
}

function scanImageKey({
  orgId,
  collectionGuid,
  scanId,
  kind,
}: ScanImageTarget): string {
  return `${collectionScanImagePrefix(orgId, collectionGuid, kind)}${scanId}.jpg`;
}

export async function storeScanImage(
  target: ScanImageTarget,
  dataUrl: string | null | undefined,
): Promise<StoredScanImage> {
  if (!dataUrl) return { key: null, dataUrl: null };
  if (!OBJECT_STORAGE_ENABLED) return { key: null, dataUrl };
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return { key: null, dataUrl };

  const key = scanImageKey(target);
  try {
    await putObject(key, parsed.body, parsed.contentType);
    return { key, dataUrl: null };
  } catch (err) {
    console.error("[scan-images] upload failed, keeping it in Postgres:", err);
    return { key: null, dataUrl };
  }
}

export async function resolveScanImageUrl(
  row: StoredScanImageRow,
): Promise<string | undefined> {
  if (row.capturedImageKey && OBJECT_STORAGE_ENABLED) {
    return presignObjectUrl(row.capturedImageKey);
  }
  return row.capturedImageDataUrl ?? undefined;
}

export function deleteScanImages(keys: (string | null)[]): void {
  deleteObjects(keys);
}

export function deleteScanImagePrefix(prefix: string): void {
  deleteObjectPrefix(prefix);
}
