import {
  DETECT_MODULES_COMMAND,
  DETECT_MODULES_TIMEOUT_MS,
  detectedModuleCount,
  isModuleDetectionSupported,
  parseSerialReply,
} from "@magic-vault/shared";
import { useCallback, useState } from "react";
import { useSorter } from "@/features/sorter/api/use-sorter";
import type { DetectModuleCountOutcome, DetectModuleCountState } from "@/lib/interfaces/calibration";

export function useDetectModuleCount(
  moduleOptions: number[],
  setModuleCount: (count: number) => void,
): DetectModuleCountState {
  const { isConnected, isReady, firmwareVersion, board, sendRequest } = useSorter();
  const [isDetecting, setIsDetecting] = useState(false);
  const [outcome, setOutcome] = useState<DetectModuleCountOutcome | null>(null);
  const isSupported = isConnected && isModuleDetectionSupported(firmwareVersion, board);

  const detect = useCallback(async () => {
    setIsDetecting(true);
    setOutcome(null);
    try {
      const { line } = await sendRequest(DETECT_MODULES_COMMAND, DETECT_MODULES_TIMEOUT_MS);
      const detected = detectedModuleCount(parseSerialReply(line));
      if (detected == null) {
        setOutcome({ kind: "failed" });
        return;
      }
      if (detected === 0) {
        setOutcome({ kind: "noneFound" });
        return;
      }
      const count = Math.min(detected, moduleOptions[moduleOptions.length - 1] ?? detected);
      setModuleCount(count);
      setOutcome({ kind: "found", count });
    } catch {
      setOutcome({ kind: "failed" });
    } finally {
      setIsDetecting(false);
    }
  }, [sendRequest, moduleOptions, setModuleCount]);

  return { isSupported, isDetecting, canDetect: isSupported && isReady && !isDetecting, outcome, detect };
}
