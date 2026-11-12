import {
  documentScannerKey,
  getDocumentScanBridge,
  requireBridge,
} from "@/features/scanner/lib/document-scan-bridge";
import {
  DOCUMENT_SCAN_FOLDER_QUERY_KEY,
  DOCUMENT_SCANNERS_QUERY_KEY,
} from "@/lib/constants/scanner";
import type {
  ActiveDocumentScanState,
  DocumentScan,
  DocumentScanError,
  ScanImageImport,
} from "@/lib/interfaces/scanner";
import { generateScanId } from "@/lib/utils";
import type { DesktopDocumentScanSettings } from "@magic-vault/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useDocumentScan(
  scanImageImport: ScanImageImport,
  collectionGuid: string | undefined,
  isDialogOpen: boolean,
): DocumentScan {
  const queryClient = useQueryClient();
  const bridge = useMemo(getDocumentScanBridge, []);
  const [selectedScannerKey, setSelectedScannerKey] = useState<string | null>(
    null,
  );
  const [activeScan, setActiveScan] = useState<ActiveDocumentScanState | null>(
    null,
  );
  const [isStopping, setIsStopping] = useState(false);
  const [scanError, setScanError] = useState<DocumentScanError | null>(null);
  const activeScanRef = useRef<ActiveDocumentScanState | null>(null);
  const enqueueFilesRef = useRef(scanImageImport.enqueueFiles);
  enqueueFilesRef.current = scanImageImport.enqueueFiles;

  const scannersQuery = useQuery({
    queryKey: DOCUMENT_SCANNERS_QUERY_KEY,
    queryFn: () => requireBridge(bridge).listDocumentScanners(),
    enabled: !!bridge && isDialogOpen,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
  const folderQuery = useQuery({
    queryKey: DOCUMENT_SCAN_FOLDER_QUERY_KEY,
    queryFn: () => requireBridge(bridge).getDocumentScanFolder(),
    enabled: !!bridge && isDialogOpen,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const scanners = useMemo(
    () => scannersQuery.data?.scanners ?? [],
    [scannersQuery.data],
  );
  const selectedScanner =
    scanners.find(
      (scanner) => documentScannerKey(scanner) === selectedScannerKey,
    ) ??
    scanners[0] ??
    null;
  const folderPath = folderQuery.data ?? null;

  const finishActiveScan = useCallback(() => {
    activeScanRef.current = null;
    setActiveScan(null);
    setIsStopping(false);
  }, []);

  useEffect(() => {
    if (!bridge) return;
    return bridge.onDocumentScanEvent((event) => {
      if (event.scanBatchId !== activeScanRef.current?.scanBatchId) return;
      if (event.type === "page") {
        enqueueFilesRef.current([
          new File([event.imageBytes.slice()], event.fileName, {
            type: event.mimeType,
          }),
        ]);
        return;
      }
      if (event.type === "error") {
        console.error(
          `[document-scan] ${event.reason}: ${event.message ?? "no details"}`,
        );
        setScanError({ reason: event.reason, message: event.message });
        return;
      }
      finishActiveScan();
    });
  }, [bridge, finishActiveScan]);

  const stopScan = useCallback(() => {
    if (!bridge || !activeScanRef.current) return;
    setIsStopping(true);
    bridge.stopDocumentScan();
  }, [bridge]);

  useEffect(() => {
    if (scanImageImport.hasHaltedOnFailure) stopScan();
  }, [scanImageImport.hasHaltedOnFailure, stopScan]);

  useEffect(
    () => () => {
      if (!activeScanRef.current) return;
      bridge?.stopDocumentScan();
      finishActiveScan();
    },
    [bridge, collectionGuid, finishActiveScan],
  );

  const startScan = useCallback(
    async (settings: DesktopDocumentScanSettings, sourceLabel: string) => {
      if (!bridge || !collectionGuid || activeScanRef.current) return;
      if (scanImageImport.isRunning) return;
      scanImageImport.clear();
      setScanError(null);
      const nextScan: ActiveDocumentScanState = {
        scanBatchId: generateScanId(),
        settings,
        sourceLabel,
      };
      activeScanRef.current = nextScan;
      setActiveScan(nextScan);
      try {
        await bridge.startDocumentScan({
          scanBatchId: nextScan.scanBatchId,
          settings,
        });
      } catch (error) {
        console.error("[document-scan] start failed:", error);
        if (activeScanRef.current === nextScan) finishActiveScan();
        setScanError({ reason: "start_failed" });
      }
    },
    [bridge, collectionGuid, finishActiveScan, scanImageImport],
  );

  const startScannerScan = useCallback(() => {
    if (!selectedScanner) return;
    void startScan(
      {
        source: "scanner",
        scannerId: selectedScanner.scannerId,
        scannerName: selectedScanner.name,
        driver: selectedScanner.driver,
      },
      selectedScanner.name,
    );
  }, [selectedScanner, startScan]);

  const startFolderWatch = useCallback(() => {
    if (!folderPath) return;
    void startScan({ source: "folder" }, folderPath);
  }, [folderPath, startScan]);

  const chooseFolder = useCallback(() => {
    if (!bridge) return;
    void bridge.chooseDocumentScanFolder().then((chosenFolderPath) => {
      queryClient.setQueryData(DOCUMENT_SCAN_FOLDER_QUERY_KEY, chosenFolderPath);
    });
  }, [bridge, queryClient]);

  const refreshScanners = useCallback(() => {
    void scannersQuery.refetch();
  }, [scannersQuery]);

  return {
    isSupported: !!bridge,
    isLoadingScanners: scannersQuery.isPending && scannersQuery.fetchStatus !== "idle",
    isRefreshingScanners: scannersQuery.isFetching,
    isScannerHelperInstalled: scannersQuery.data?.isScannerHelperInstalled ?? true,
    scanners,
    selectedScanner,
    selectScanner: setSelectedScannerKey,
    refreshScanners,
    folderPath,
    chooseFolder,
    startScannerScan,
    startFolderWatch,
    stopScan,
    activeScan,
    isStopping,
    scanError,
  };
}
