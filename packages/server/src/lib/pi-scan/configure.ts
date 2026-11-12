import {
  DEFAULT_CALIBRATION,
  FOIL_NUDGE_MODULE_NUMBER,
  FOIL_NUDGE_SERVO_TIMEOUT_MS,
  type ServoCalibration,
} from "@magic-vault/shared";
import type { PiScanSorterConfiguration } from "../interfaces/pi-scan";

function moduleCalibrationPayload(
  module: number,
  calibration: ServoCalibration,
) {
  const {
    bottomClosed,
    bottomOpen,
    paddleClosed,
    paddleOpen,
    pusherLeft,
    pusherNeutral,
    pusherRight,
    pusherHoldDuration,
    paddleCloseDelay,
    paddleOpenDelay,
  } = calibration;
  return {
    module,
    bottomClosed,
    bottomOpen,
    paddleClosed,
    paddleOpen,
    pusherLeft,
    pusherNeutral,
    pusherRight,
    pusherHoldDuration,
    paddleCloseDelay,
    paddleOpenDelay,
  };
}

export async function configurePiScanSorter(
  command: (
    payload: object,
    timeoutMs: number,
  ) => Promise<Record<string, unknown>>,
  configuration: PiScanSorterConfiguration,
): Promise<void> {
  const checked = async (payload: object) => {
    const reply = await command(payload, FOIL_NUDGE_SERVO_TIMEOUT_MS);
    if (reply.status !== "ok" || reply.error)
      throw new Error(
        "The sorter did not confirm the saved calibration settings.",
      );
  };
  await checked({ setChannelOffset: configuration.channelOffset });
  for (const module of configuration.moduleCalibrations) {
    await checked({
      setConfig: moduleCalibrationPayload(
        module.moduleNumber,
        module.calibration,
      ),
    });
  }
  if (configuration.feederCalibration) {
    const {
      speed,
      duration,
      pulseDuration,
      pauseDuration,
      settleDuration,
      reverseSpeed,
      reverseDuration,
      feedRetryCount,
    } = configuration.feederCalibration;
    await checked({
      setFeederConfig: {
        speed,
        duration,
        pulseDuration,
        pauseDuration,
        settleDuration,
        reverseSpeed,
        reverseDuration,
        feedRetryCount,
      },
    });
  }
}

export async function applyPiScanNudgeCalibration(
  command: (
    payload: object,
    timeoutMs: number,
  ) => Promise<Record<string, unknown>>,
  calibration: ServoCalibration,
) {
  const reply = await command(
    {
      setConfig: moduleCalibrationPayload(
        FOIL_NUDGE_MODULE_NUMBER,
        calibration,
      ),
    },
    FOIL_NUDGE_SERVO_TIMEOUT_MS,
  );
  if (reply.status !== "ok" || reply.error)
    throw new Error("The sorter did not confirm the foil nudge calibration.");
}

export function hasConfirmedPiScanNudgeCalibration(
  calibration: ServoCalibration | null,
  confirmedCalibration: ServoCalibration | null | undefined,
): boolean {
  return (
    !!calibration &&
    !!confirmedCalibration &&
    (Object.keys(DEFAULT_CALIBRATION) as (keyof ServoCalibration)[]).every(
      (key) => calibration[key] === confirmedCalibration[key],
    )
  );
}
