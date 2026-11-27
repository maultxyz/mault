import { useCallback, useEffect, useState } from "react";
import { warmScanModels } from "@/features/scanner/lib/inference";
import type { ScanModelsReadyState, ScanModelsStatus } from "@/lib/interfaces/storage";

export function useScanModelsReady(): ScanModelsReadyState {
  const [status, setStatus] = useState<ScanModelsStatus>("loading");
  const loadModels = useCallback(() => {
    setStatus("loading");
    warmScanModels()
      .then(() => setStatus("ready"))
      .catch(() => setStatus("failed"));
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  return { areModelsReady: status === "ready", haveModelsFailed: status === "failed", retryModels: loadModels };
}
