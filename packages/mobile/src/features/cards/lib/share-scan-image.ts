import {
  collectionScanImageDownloadPath,
  scanImageDownloadFileName,
} from "@magic-vault/shared";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { getAuthHeaders } from "@/lib/api/client";
import { API_BASE } from "@/lib/constants/config";
import type { ScanImageShareRequest } from "@/lib/interfaces/cards";

export async function shareScanImage({ collectionGuid, scanId, side, cardName }: ScanImageShareRequest): Promise<void> {
  const fileName = scanImageDownloadFileName(cardName, side);
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  const downloaded = await File.downloadFileAsync(
    `${API_BASE}${collectionScanImageDownloadPath(collectionGuid, scanId, side)}`,
    file,
    { headers: await getAuthHeaders() },
  );
  await Sharing.shareAsync(downloaded.uri, {
    mimeType: "image/jpeg",
    UTI: "public.jpeg",
    dialogTitle: fileName,
  });
}
