import { useModuleConfigs } from "@/features/calibration/api/use-module-configs";
import { useCollections } from "@/features/collections/api/use-collections";
import { useFoilDetectionGameKey } from "@/features/scanner/api/use-foil-detection-game-key";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useSerial } from "@/features/scanner/api/use-serial";
import { encodeImageAsJpeg } from "@/features/scanner/lib/encode-image-data";
import {
  FOIL_NUDGE_DIAGNOSTIC_IMAGE_WIDTH,
  FOIL_NUDGE_DIAGNOSTIC_JPEG_QUALITY,
} from "@/lib/constants/scanner";
import { delay } from "@/lib/delay";
import { scanLog } from "@/lib/scan-log";
import {
  executeScanFoilNudge,
  FOIL_NUDGE_MODULE_NUMBER,
  type CheckFoilByNudge,
} from "@magic-vault/shared";
import { useCallback, useRef } from "react";

export function useFoilNudgeCheck(): CheckFoilByNudge {
  const { isReady, firmwareVersion, foilNudgeFirmwareLimits, sendRequest, runWhenIdle } =
    useSerial();
  const { configs } = useModuleConfigs();
  const { forceFoilType } = useScannedCards();
  const { activeCollection } = useCollections();
  const foilDetectionGameKey = useFoilDetectionGameKey(activeCollection?.game?.key);

  const latest = {
    isReady,
    firmwareVersion,
    foilNudgeFirmwareLimits,
    sendRequest,
    runWhenIdle,
    configs,
    forceFoilType,
    gameKey: foilDetectionGameKey,
  };
  const latestRef = useRef(latest);
  latestRef.current = latest;

  return useCallback<CheckFoilByNudge>(async (card, captureAfterNudge, before, isActive) => {
    const current = latestRef.current;
    let ranWhileSorterIdle = false;
    const detection = await current.runWhenIdle(async () => {
      ranWhileSorterIdle = true;
      return executeScanFoilNudge({
        gameKey: current.gameKey,
        forceFoilType: current.forceFoilType,
        foilOnlyFoilType: card.foilOnlyFoilType,
        isReady: current.isReady,
        firmwareVersion: current.firmwareVersion,
        firmwareLimits: current.foilNudgeFirmwareLimits,
        calibration: current.configs.find((config) => config.moduleNumber === FOIL_NUDGE_MODULE_NUMBER)?.calibration,
        before,
        sendCommand: current.sendRequest,
        capture: captureAfterNudge,
        delay,
        isActive: () => latestRef.current.isReady && (isActive?.() ?? true),
        encodeDiagnostics: (image) => encodeImageAsJpeg(image, FOIL_NUDGE_DIAGNOSTIC_IMAGE_WIDTH, FOIL_NUDGE_DIAGNOSTIC_JPEG_QUALITY),
      });
    });
    if (!ranWhileSorterIdle) scanLog("[foil-nudge] skipped: the sorter was busy with another command");
    return detection;
  }, []);
}
