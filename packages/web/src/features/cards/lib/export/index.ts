import {
  exportFilename,
  type CollectionCsvExportRequest,
  type ExportAdapter,
  type StorageLocationCsvExportRequest,
} from "@magic-vault/shared";
import { apiPostBlob } from "@/lib/api/client";

export {
  allExportAdapters,
  supportsGame,
  type ExportAdapter,
} from "@magic-vault/shared";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportSlug(exportName: string): string {
  return exportName.replace(/\s+/g, "-").toLowerCase();
}

export async function downloadCollectionCsv(
  collectionGuid: string,
  adapter: ExportAdapter,
  exportName: string,
  request: Omit<CollectionCsvExportRequest, "format">,
): Promise<void> {
  const csv = await apiPostBlob(`/api/collections/${collectionGuid}/cards/csv-export`, {
    ...request,
    format: adapter.key,
  });
  downloadBlob(csv, exportFilename(adapter, exportSlug(exportName)));
}

export async function downloadStorageLocationCsv(
  locationGuid: string,
  adapter: ExportAdapter,
  exportName: string,
  request: Omit<StorageLocationCsvExportRequest, "format">,
): Promise<void> {
  const csv = await apiPostBlob(`/api/storage-locations/${locationGuid}/cards/csv-export`, {
    ...request,
    format: adapter.key,
  });
  downloadBlob(csv, exportFilename(adapter, exportSlug(exportName)));
}
