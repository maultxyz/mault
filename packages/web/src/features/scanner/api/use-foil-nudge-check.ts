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
  detectFoilFromNudges,
  FIRMWARE_FEATURE_MIN_VERSIONS,
  FOIL_NUDGE_MODULE_NUMBER,
  FOIL_NUDGE_SERVO_TIMEOUT_MS,
  FOIL_NUDGE_SETTLE_MS,
  foilNudgeCommands,
  isFirmwareFeatureSupported,
  isFoilNudgeReplyOk,
  type CheckFoilByNudge,
  type FoilNudgeDirection,
  type RgbaImage,
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
    firmwareSupportsNudge: isFirmwareFeatureSupported(firmwareVersion, "pusherNudge"),
    sendRequest,
    runWhenIdle,
    configs,
    forceFoilType,
    gameKey: foilDetectionGameKey,
  };
  const latestRef = useRef(latest);
  latestRef.current = latest;

  return useCallback<CheckFoilByNudge>(async (card, captureAfterNudge, before) => {
    const {
      isReady,
      firmwareVersion,
      foilNudgeFirmwareLimits,
      firmwareSupportsNudge,
      sendRequest,
      runWhenIdle,
      configs,
      forceFoilType,
      gameKey,
    } = latestRef.current;
    if (!gameKey) return null;
    if (forceFoilType || card.foilOnlyFoilType) return null;
    if (!isReady) {
      scanLog("[foil-nudge] skipped: the sorter isn't connected and ready");
      return null;
    }
    if (!firmwareSupportsNudge) {
      scanLog(
        `[foil-nudge] skipped: firmware ${firmwareVersion ?? "unknown"} is older than ${FIRMWARE_FEATURE_MIN_VERSIONS.pusherNudge}`,
      );
      return null;
    }
    const moduleConfig = configs.find(
      (config) => config.moduleNumber === FOIL_NUDGE_MODULE_NUMBER,
    );
    if (!moduleConfig) {
      scanLog(`[foil-nudge] skipped: no calibration for module ${FOIL_NUDGE_MODULE_NUMBER}`);
      return null;
    }

    if (!foilNudgeFirmwareLimits) {
      scanLog("[foil-nudge] skipped: the firmware doesn't report nudge limits, so a nudge could lower the side paddle");
      return null;
    }
    const commands = foilNudgeCommands(moduleConfig.calibration, foilNudgeFirmwareLimits);
    if (!commands) {
      scanLog("[foil-nudge] skipped: the pusher's travel is too short for a nudge that keeps the side paddle closed");
      return null;
    }
    const encodeForDiagnostics = (image: RgbaImage) =>
      encodeImageAsJpeg(image, FOIL_NUDGE_DIAGNOSTIC_IMAGE_WIDTH, FOIL_NUDGE_DIAGNOSTIC_JPEG_QUALITY);

    const nudgeAndCompare = async () => {
      const afterByDirection: Partial<Record<FoilNudgeDirection, RgbaImage>> = {};
      for (const { direction, command } of commands.nudges) {
        const nudged = await sendRequest(command, FOIL_NUDGE_SERVO_TIMEOUT_MS);
        if (!nudged.sent || !isFoilNudgeReplyOk(nudged.line)) {
          scanLog(`[foil-nudge] ${direction} nudge not confirmed (${nudged.line || "no reply"})`);
          continue;
        }
        await delay(FOIL_NUDGE_SETTLE_MS);
        const after = await captureAfterNudge();
        if (after) afterByDirection[direction] = after;
        else scanLog(`[foil-nudge] card not found in the photo after the ${direction} nudge`);
      }
      const detection = detectFoilFromNudges(before, afterByDirection, gameKey);
      if (!detection) {
        scanLog("[foil-nudge] skipped: no usable photo after either nudge");
        return null;
      }
      const changes = Object.entries(detection.nudgeChangesByDirection ?? {})
        .map(([direction, change]) => `${direction} ${change.meanCellChange.toFixed(3)}`)
        .join(", ");
      scanLog(`[foil-nudge] ${card.name}: nudge change ${changes}`);
      const beforeDataUrl = encodeForDiagnostics(before);
      const afterDataUrlByDirection = Object.fromEntries(
        Object.entries(afterByDirection).flatMap(([direction, image]) => {
          const dataUrl = encodeForDiagnostics(image);
          return dataUrl ? [[direction, dataUrl]] : [];
        }),
      );
      return beforeDataUrl
        ? { ...detection, nudgeImages: { beforeDataUrl, afterDataUrlByDirection } }
        : detection;
    };

    let ranWhileSorterIdle = false;
    const detection = await runWhenIdle(async () => {
      ranWhileSorterIdle = true;
      try {
        return await nudgeAndCompare();
      } finally {
        await sendRequest(commands.restorePusher, FOIL_NUDGE_SERVO_TIMEOUT_MS);
      }
    });
    if (!ranWhileSorterIdle) {
      scanLog("[foil-nudge] skipped: the sorter was busy with another command");
    }
    return detection;
  }, []);
}
