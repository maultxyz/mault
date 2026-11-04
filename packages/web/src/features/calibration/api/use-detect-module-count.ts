import { useModuleCountConfig } from "@/features/calibration/api/use-module-count-config";
import { useSerial } from "@/features/scanner/api/use-serial";
import { useStationToast } from "@/features/scanner/api/use-station-toast";
import type { DetectModuleCountState } from "@/lib/interfaces/calibration";
import {
  DETECT_MODULES_COMMAND,
  DETECT_MODULES_TIMEOUT_MS,
  detectedModuleCount,
  isModuleDetectionSupported,
  parseSerialReply,
} from "@magic-vault/shared";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

export function useDetectModuleCount(): DetectModuleCountState {
  const { t } = useTranslation("calibration");
  const toast = useStationToast();
  const { isConnected, isReady, firmwareVersion, board, sendRequest } =
    useSerial();
  const { options, stage } = useModuleCountConfig();
  const [isDetecting, setIsDetecting] = useState(false);
  const isSupported =
    isConnected && isModuleDetectionSupported(firmwareVersion, board);

  const detect = useCallback(async () => {
    setIsDetecting(true);
    try {
      const { line } = await sendRequest(
        DETECT_MODULES_COMMAND,
        DETECT_MODULES_TIMEOUT_MS,
      );
      const detected = detectedModuleCount(parseSerialReply(line));
      if (detected == null) {
        toast.error(t("moduleCountStepper.detect.failed"));
        return;
      }
      if (detected === 0) {
        toast.error(t("moduleCountStepper.detect.noneFound"));
        return;
      }
      const maxModules = options[options.length - 1] ?? detected;
      const count = Math.min(detected, maxModules);
      stage(count);
      toast.success(t("moduleCountStepper.detect.found", { count }));
    } catch {
      toast.error(t("moduleCountStepper.detect.failed"));
    } finally {
      setIsDetecting(false);
    }
  }, [sendRequest, options, stage, toast, t]);

  return {
    isSupported,
    isDetecting,
    canDetect: isSupported && isReady && !isDetecting,
    detect,
  };
}
