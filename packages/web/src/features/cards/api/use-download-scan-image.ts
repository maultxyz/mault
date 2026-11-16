import { downloadBlob } from "@/lib/download";
import { toast } from "@/lib/toast";
import type { ScanImageDownloadRequest } from "@/lib/interfaces/cards";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function useDownloadScanImage() {
  const { t } = useTranslation("cards");
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadScanImage = async ({ loadImage, fileName }: ScanImageDownloadRequest) => {
    setIsDownloading(true);
    try {
      downloadBlob(await loadImage(), fileName);
    } catch {
      toast.error(t("downloadScanImage.failed"));
    } finally {
      setIsDownloading(false);
    }
  };

  return { downloadScanImage, isDownloading };
}
