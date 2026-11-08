import { useCameraContext } from "@/features/scanner/api/use-camera";
import { useStationToast } from "@/features/scanner/api/use-station-toast";
import {
  documentScanArchiveImage,
  folderDisplayName,
  getDocumentScanArchiveBridge,
} from "@/features/scanner/lib/document-scan-bridge";
import {
  DOCUMENT_SCAN_ARCHIVE_FAILED_TOAST_ID,
  DOCUMENT_SCAN_ARCHIVE_FOLDER_QUERY_KEY,
} from "@/lib/constants/scanner";
import type {
  DocumentScanArchiveImages,
  ScanPlacement,
} from "@/lib/interfaces/scanner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

export function useDocumentScanArchiveFolder() {
  const bridge = useMemo(getDocumentScanArchiveBridge, []);
  const queryClient = useQueryClient();
  const { data: archiveFolder = null } = useQuery({
    queryKey: DOCUMENT_SCAN_ARCHIVE_FOLDER_QUERY_KEY,
    queryFn: () => bridge?.getDocumentScanArchiveFolder() ?? null,
    enabled: !!bridge,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

  const chooseArchiveFolder = useCallback(async () => {
    if (!bridge) return;
    const folderPath = await bridge.chooseDocumentScanArchiveFolder();
    queryClient.setQueryData(DOCUMENT_SCAN_ARCHIVE_FOLDER_QUERY_KEY, folderPath);
  }, [bridge, queryClient]);

  const clearArchiveFolder = useCallback(async () => {
    if (!bridge) return;
    await bridge.clearDocumentScanArchiveFolder();
    queryClient.setQueryData(DOCUMENT_SCAN_ARCHIVE_FOLDER_QUERY_KEY, null);
  }, [bridge, queryClient]);

  return {
    bridge,
    isArchiveSupported: !!bridge,
    archiveFolder,
    chooseArchiveFolder,
    clearArchiveFolder,
  };
}

export function useDocumentScanArchive() {
  const { t } = useTranslation("scanner");
  const toast = useStationToast();
  const { cameraSource } = useCameraContext();
  const { bridge, archiveFolder } = useDocumentScanArchiveFolder();

  return useCallback(
    (placement: ScanPlacement | null, images: DocumentScanArchiveImages) => {
      const { frontImageUrl, backImageUrl, cardName } = images;
      if (
        !bridge ||
        !archiveFolder ||
        !placement ||
        !frontImageUrl ||
        cameraSource !== "document-scanner"
      ) {
        return;
      }
      void Promise.all([
        documentScanArchiveImage("front", frontImageUrl),
        ...(backImageUrl ? [documentScanArchiveImage("back", backImageUrl)] : []),
      ])
        .then((archiveImages) =>
          bridge.archiveDocumentScan({
            scanId: placement.scanId,
            collectionName: placement.collectionName,
            binNumber: placement.binNumber,
            cardName,
            images: archiveImages,
          }),
        )
        .catch((error: unknown) => {
          console.error("Failed to save the scan to its folder:", error);
          toast.error(
            t("documentScannerFeed.archiveFailed", {
              folder: folderDisplayName(archiveFolder),
            }),
            { id: DOCUMENT_SCAN_ARCHIVE_FAILED_TOAST_ID },
          );
        });
    },
    [bridge, archiveFolder, cameraSource, toast, t],
  );
}
