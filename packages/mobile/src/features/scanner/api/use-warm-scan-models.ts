import { useEffect } from "react";
import { InteractionManager } from "react-native";
import { SCAN_MODEL_WARM_DELAY_MS } from "@/lib/constants/scanner";

let hasWarmedScanModels = false;

export function useWarmScanModels(isHomeLoaded: boolean): void {
  useEffect(() => {
    if (!isHomeLoaded || hasWarmedScanModels) return;
    let interaction: { cancel: () => void } | null = null;
    const timer = setTimeout(() => {
      interaction = InteractionManager.runAfterInteractions(() => {
        if (hasWarmedScanModels) return;
        hasWarmedScanModels = true;
        void import("@/features/scanner/lib/inference")
          .then(({ areScanModelsDownloaded, warmScanModels }) =>
            areScanModelsDownloaded() ? warmScanModels() : undefined,
          )
          .catch(() => {});
      });
    }, SCAN_MODEL_WARM_DELAY_MS);
    return () => {
      clearTimeout(timer);
      interaction?.cancel();
    };
  }, [isHomeLoaded]);
}
