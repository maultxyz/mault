import type { FeederCalibration, ServoCalibration } from "@magic-vault/shared";

export const FEEDER_CALIBRATION_INPUT_KEYS = [
  "speed",
  "duration",
  "pulseDuration",
  "pauseDuration",
  "settleDuration",
  "reverseSpeed",
  "reverseDuration",
  "feedRetryCount",
] as const satisfies readonly (keyof FeederCalibration)[];

export const SERVO_CALIBRATION_INPUT_KEYS = [
  "bottomClosed",
  "bottomOpen",
  "paddleClosed",
  "paddleOpen",
  "pusherLeft",
  "pusherNeutral",
  "pusherRight",
  "pusherHoldDuration",
  "paddleCloseDelay",
  "paddleOpenDelay",
] as const satisfies readonly (keyof ServoCalibration)[];

export const CALIBRATION_INPUT_VALUE_MIN = -1_000_000;

export const CALIBRATION_INPUT_VALUE_MAX = 1_000_000;

export const CALIBRATION_INPUT_INVALID_MESSAGE = "Calibration values must be whole numbers.";
